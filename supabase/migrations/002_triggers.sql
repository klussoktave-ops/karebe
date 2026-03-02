-- ============================================================
-- 002_triggers.sql — Karebe reactive trigger functions
-- ============================================================

-- ============================================================
-- HELPER: updated_at auto-stamp
-- ============================================================
create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_cart_items_updated_at
  before update on cart_items
  for each row execute function fn_set_updated_at();

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function fn_set_updated_at();

create trigger trg_delivery_updated_at
  before update on delivery_assignments
  for each row execute function fn_set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function fn_set_updated_at();

-- ============================================================
-- TRIGGER 1: Cart total notification
-- Fires AFTER INSERT/UPDATE/DELETE on cart_items
-- Inserts a notification for the user with the updated cart total
-- ============================================================
create or replace function fn_notify_cart_total()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_total   numeric(12,2);
begin
  -- Determine affected user
  if TG_OP = 'DELETE' then
    v_user_id := old.user_id;
  else
    v_user_id := new.user_id;
  end if;

  -- Recalculate cart total
  select coalesce(sum(
    ci.quantity * (
      select (elem->>'price')::numeric
      from products p
      cross join lateral jsonb_array_elements(p.variants) as elem
      where p.id = ci.product_id
        and elem->>'id' = ci.variant_id
      limit 1
    )
  ), 0)
  into v_total
  from cart_items ci
  where ci.user_id = v_user_id;

  -- Insert notification
  insert into notifications (user_id, type, title, message, payload)
  values (
    v_user_id,
    'cart_total_updated',
    'Cart Updated',
    'Your cart total is now KES ' || v_total,
    jsonb_build_object('total', v_total, 'user_id', v_user_id)
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_cart_total_notify
  after insert or update or delete on cart_items
  for each row execute function fn_notify_cart_total();

-- ============================================================
-- TRIGGER 2: Order creation → copy cart items + clear cart
-- Fires AFTER INSERT on orders
-- ============================================================
create or replace function fn_auto_order_items()
returns trigger language plpgsql security definer as $$
declare
  v_item  record;
  v_price numeric(12,2);
  v_name  text;
  v_vol   text;
  v_total numeric(12,2) := 0;
begin
  -- Copy each cart item into order_items
  for v_item in
    select ci.*, p.name as product_name
    from cart_items ci
    join products p on p.id = ci.product_id
    where ci.user_id = new.user_id
  loop
    -- Extract variant price and volume from jsonb
    select
      (elem->>'price')::numeric,
      elem->>'volume'
    into v_price, v_vol
    from jsonb_array_elements(
      (select variants from products where id = v_item.product_id)
    ) as elem
    where elem->>'id' = v_item.variant_id
    limit 1;

    insert into order_items (order_id, product_id, product_name, variant_id, volume, quantity, price)
    values (new.id, v_item.product_id, v_item.product_name, v_item.variant_id, v_vol, v_item.quantity, coalesce(v_price, 0));

    v_total := v_total + (v_item.quantity * coalesce(v_price, 0));
  end loop;

  -- Update order total
  update orders set total = v_total where id = new.id;

  -- Clear the cart
  delete from cart_items where user_id = new.user_id;

  return new;
end;
$$;

create trigger trg_auto_order_items
  after insert on orders
  for each row execute function fn_auto_order_items();

-- ============================================================
-- TRIGGER 3: Stock deduction after order_items insert
-- Fires AFTER INSERT on order_items
-- Atomically decrements variant stock in products.variants jsonb
-- ============================================================
create or replace function fn_deduct_stock()
returns trigger language plpgsql security definer as $$
declare
  v_current_stock int;
  v_idx           int;
  v_variants      jsonb;
begin
  -- Lock products row
  select variants into v_variants
  from products
  where id = new.product_id
  for update;

  -- Find the variant index
  select i - 1 into v_idx
  from generate_series(1, jsonb_array_length(v_variants)) as i
  where (v_variants->>(i-1))::jsonb->>'id' = new.variant_id;

  if v_idx is null then
    raise exception 'Variant % not found in product %', new.variant_id, new.product_id;
  end if;

  v_current_stock := (v_variants->v_idx->>'stock')::int;

  if v_current_stock < new.quantity then
    raise exception 'STOCK_INSUFFICIENT: product % variant % has % units, need %',
      new.product_id, new.variant_id, v_current_stock, new.quantity;
  end if;

  -- Deduct stock
  update products
  set variants = jsonb_set(
    variants,
    array[v_idx::text, 'stock'],
    to_jsonb(v_current_stock - new.quantity)
  )
  where id = new.product_id;

  -- Insert low-stock notification for admins if stock drops below 5
  if (v_current_stock - new.quantity) < 5 then
    insert into notifications (role, type, title, message, payload)
    values (
      'admin',
      'stock_low',
      'Low Stock Alert',
      'Product ' || new.product_name || ' (' || new.variant_id || ') has ' ||
        (v_current_stock - new.quantity) || ' units remaining.',
      jsonb_build_object(
        'product_id', new.product_id,
        'variant_id', new.variant_id,
        'stock_remaining', v_current_stock - new.quantity
      )
    );
  end if;

  return new;
end;
$$;

create trigger trg_deduct_stock
  after insert on order_items
  for each row execute function fn_deduct_stock();

-- ============================================================
-- TRIGGER 4: Order status change → user + admin notifications
-- Fires AFTER UPDATE of status on orders
-- ============================================================
create or replace function fn_order_status_notification()
returns trigger language plpgsql security definer as $$
begin
  if old.status = new.status then
    return new;
  end if;

  -- Notify the customer
  if new.user_id is not null then
    insert into notifications (user_id, type, title, message, payload)
    values (
      new.user_id,
      'order_status_updated',
      'Order Update',
      'Your order #' || substring(new.id::text, 1, 8) || ' is now ' || new.status,
      jsonb_build_object('order_id', new.id, 'status', new.status)
    );
  end if;

  -- Broadcast to admin role
  insert into notifications (role, type, title, message, payload)
  values (
    'admin',
    'order_status_updated',
    'Order Status Changed',
    'Order #' || substring(new.id::text, 1, 8) || ' changed from ' || old.status || ' to ' || new.status,
    jsonb_build_object('order_id', new.id, 'old_status', old.status, 'new_status', new.status)
  );

  return new;
end;
$$;

create trigger trg_order_status_notify
  after update of status on orders
  for each row execute function fn_order_status_notification();

-- ============================================================
-- TRIGGER 5: New order → notify admin + customer (order_created)
-- Fires AFTER INSERT on orders
-- (Separate from fn_auto_order_items to keep concerns split)
-- ============================================================
create or replace function fn_order_created_notification()
returns trigger language plpgsql security definer as $$
begin
  -- Notify customer
  if new.user_id is not null then
    insert into notifications (user_id, type, title, message, payload)
    values (
      new.user_id,
      'order_created',
      'Order Placed!',
      'Your order #' || substring(new.id::text, 1, 8) || ' has been received.',
      jsonb_build_object('order_id', new.id, 'total', new.total)
    );
  end if;

  -- Broadcast to admins
  insert into notifications (role, type, title, message, payload)
  values (
    'admin',
    'order_created',
    'New Order',
    'New order #' || substring(new.id::text, 1, 8) ||
      coalesce(' from ' || new.customer_phone, '') ||
      ' — KES ' || new.total,
    jsonb_build_object(
      'order_id', new.id,
      'total', new.total,
      'branch_id', new.branch_id,
      'payment_method', new.payment_method,
      'delivery_channel', new.delivery_channel
    )
  );

  return new;
end;
$$;

-- Note: fn_auto_order_items runs first (updates total before notification fires)
-- so we use a second after-insert trigger at statement order B
create trigger trg_order_created_notify
  after insert on orders
  for each row execute function fn_order_created_notification();

-- ============================================================
-- TRIGGER 6: Delivery assignment → notify rider
-- Fires AFTER INSERT or UPDATE on delivery_assignments
-- ============================================================
create or replace function fn_delivery_notification()
returns trigger language plpgsql security definer as $$
declare
  v_rider_user_id uuid;
  v_notif_type    notification_type;
  v_title         text;
  v_message       text;
begin
  -- Try to resolve rider UUID (may be text ID in legacy data)
  begin
    v_rider_user_id := new.rider_id::uuid;
  exception when others then
    v_rider_user_id := null;
  end;

  if TG_OP = 'INSERT' then
    v_notif_type := 'delivery_assigned';
    v_title      := 'New Delivery Assigned';
    v_message    := 'You have been assigned order #' || substring(new.order_id::text, 1, 8);
  else
    v_notif_type := 'delivery_status_updated';
    v_title      := 'Delivery Status Updated';
    v_message    := 'Delivery for order #' || substring(new.order_id::text, 1, 8) || ' is now ' || new.status;

    -- Also update parent order status
    if new.status = 'in_progress' then
      update orders set status = 'dispatched' where id = new.order_id;
    elsif new.status = 'completed' then
      update orders set status = 'delivered' where id = new.order_id;
    end if;
  end if;

  -- Notify rider (by user_id if resolvable, or broadcast to rider role)
  if v_rider_user_id is not null then
    insert into notifications (user_id, role, type, title, message, payload)
    values (
      v_rider_user_id,
      'rider',
      v_notif_type,
      v_title,
      v_message,
      jsonb_build_object('order_id', new.order_id, 'assignment_id', new.id, 'status', new.status)
    );
  else
    insert into notifications (role, type, title, message, payload)
    values (
      'rider',
      v_notif_type,
      v_title,
      v_message,
      jsonb_build_object('order_id', new.order_id, 'assignment_id', new.id, 'status', new.status, 'rider_id', new.rider_id)
    );
  end if;

  -- Notify admin of update
  if TG_OP = 'UPDATE' then
    insert into notifications (role, type, title, message, payload)
    values (
      'admin',
      'delivery_status_updated',
      'Delivery Update',
      'Order #' || substring(new.order_id::text, 1, 8) || ' delivery is ' || new.status,
      jsonb_build_object('order_id', new.order_id, 'assignment_id', new.id, 'status', new.status, 'rider_id', new.rider_id)
    );
  end if;

  return new;
end;
$$;

create trigger trg_delivery_notify
  after insert or update on delivery_assignments
  for each row execute function fn_delivery_notification();

-- ============================================================
-- TRIGGER 7: Product added → notify admins
-- Fires AFTER INSERT on products
-- ============================================================
create or replace function fn_product_added_notification()
returns trigger language plpgsql security definer as $$
begin
  insert into notifications (role, type, title, message, payload)
  values (
    'admin',
    'product_added',
    'New Product Added',
    new.name || ' (' || new.category || ') has been added to the catalog.',
    jsonb_build_object('product_id', new.id, 'name', new.name, 'category', new.category)
  );

  return new;
end;
$$;

create trigger trg_product_added_notify
  after insert on products
  for each row execute function fn_product_added_notification();
