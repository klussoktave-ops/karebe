window.KAREBE_SEED = {
  business: {
    name: "Karebe Wines & Spirits",
    phone: "+254700123456",
    whatsappPhone: "254700123456"
  },
  admin: {
    username: "karebe",
    password: "karebe1234"
  },
  users: [
    {
      id: "u_owner",
      name: "Karebe",
      username: "karebe-owner",
      password: "karebeowner1234",
      role: "super-admin",
      phone: "+254700123456",
      branchId: null,
      active: true
    },
    {
      id: "u_wangige_admin",
      name: "Karebe",
      username: "karebe",
      password: "karebe1234",
      role: "admin",
      phone: "+254701111111",
      branchId: "b_wangige",
      active: true
    },
    {
      id: "u_karura_admin",
      name: "Dante",
      username: "dante",
      password: "dante1234",
      role: "admin",
      phone: "+254702222222",
      branchId: "b_karura",
      active: true
    }
  ],
  branches: [
    {
      id: "b_wangige",
      name: "Wangige",
      isMain: true,
      location: "Wangige (Main Branch)",
      phone: "+254701111111",
      onShiftUserId: "u_wangige_admin"
    },
    {
      id: "b_karura",
      name: "Karura",
      isMain: false,
      location: "Karura",
      phone: "+254702222222",
      onShiftUserId: "u_karura_admin"
    }
  ],
  paymentInfrastructure: {
    provider: "safaricom-daraja",
    environment: "sandbox",
    stkPushPath: "/api/payments/daraja/stkpush",
    callbackPath: "/api/payments/daraja/callback",
    credentials: {
      consumerKeyEnv: "DARAJA_CONSUMER_KEY",
      consumerSecretEnv: "DARAJA_CONSUMER_SECRET",
      passKeyEnv: "DARAJA_PASSKEY"
    }
  },
  tills: [
    {
      id: "till_wangige",
      branchId: "b_wangige",
      type: "BUY_GOODS",
      tillNumber: "5132456",
      businessShortCode: "174379",
      accountReference: "KAREBE-WANGIGE",
      active: true
    },
    {
      id: "till_karura",
      branchId: "b_karura",
      type: "BUY_GOODS",
      tillNumber: "5132457",
      businessShortCode: "174379",
      accountReference: "KAREBE-KARURA",
      active: true
    }
  ],
  categories: [
    "Wine",
    "Whiskey",
    "Vodka",
    "Gin",
    "Champagne",
    "Local Spirits",
    "Keg"
  ],
  products: [
    {
      id: "p1",
      name: "Nederburg Cabernet",
      category: "Wine",
      description: "Dry red wine with bold berry notes.",
      image: "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=700&q=70",
      popular: true,
      newArrival: false,
      variants: [
        { id: "v1", volume: "750ml", price: 2400, stock: 22 }
      ]
    },
    {
      id: "p2",
      name: "Jameson Irish Whiskey",
      category: "Whiskey",
      description: "Smooth triple-distilled classic.",
      image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=700&q=70",
      popular: true,
      newArrival: true,
      variants: [
        { id: "v2", volume: "750ml", price: 3600, stock: 16 },
        { id: "v3", volume: "1L", price: 4700, stock: 9 }
      ]
    },
    {
      id: "p3",
      name: "Smirnoff Red",
      category: "Vodka",
      description: "Neutral spirit for easy mixing.",
      image: "https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg?auto=compress&cs=tinysrgb&w=800",
      popular: false,
      newArrival: false,
      variants: [
        { id: "v4", volume: "750ml", price: 1800, stock: 30 }
      ]
    },
    {
      id: "p4",
      name: "Keg Beer",
      category: "Keg",
      description: "Freshly tapped keg, perfect for chill sessions.",
      image: "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg?auto=compress&cs=tinysrgb&w=800",
      popular: true,
      newArrival: true,
      variants: [
        { id: "v5", volume: "Per Glass", price: 80, stock: 500 }
      ]
    }
  ],
  riders: [
    {
      id: "r1",
      name: "John Mwangi",
      phone: "+254711000111",
      pin: "1111",
      active: true
    },
    {
      id: "r2",
      name: "Faith Achieng",
      phone: "+254722000222",
      pin: "2222",
      active: true
    }
  ],
  customerProfiles: [
    {
      id: "cst_001",
      fullName: "Amina Njeri",
      phone: "+254712111222",
      email: "amina@example.com",
      defaultBranchId: "b_wangige",
      cart: [
        {
          id: "c_seed_1",
          productId: "p4",
          variantId: "v5",
          productName: "Keg Beer",
          volume: "Per Glass",
          qty: 3,
          unitPrice: 80,
          lineTotal: 240,
          branchId: "b_wangige",
          selectedForOrderCard: true
        },
        {
          id: "c_seed_2",
          productId: "p3",
          variantId: "v4",
          productName: "Smirnoff Red",
          volume: "750ml",
          qty: 1,
          unitPrice: 1800,
          lineTotal: 1800,
          branchId: "b_wangige",
          selectedForOrderCard: true
        }
      ],
      orderIds: ["o_seed_001"]
    }
  ],
  activeCustomerProfileId: "cst_001",
  orders: [
    {
      id: "o_seed_001",
      customerProfileId: "cst_001",
      customerPhone: "+254712111222",
      source: "WHATSAPP",
      paymentStatus: "PENDING",
      paymentMethod: "MPESA_DARAJA",
      paymentRequest: {
        merchantRequestId: "seed-merchant-001",
        checkoutRequestId: "seed-checkout-001",
        tillId: "till_wangige",
        mpesaNumber: "+254712111222",
        status: "PENDING"
      },
      status: "CONFIRMED",
      total: 2040,
      createdAt: "2026-02-28T09:00:00.000Z",
      createdBy: "karebe",
      branchId: "b_wangige",
      items: [
        {
          productId: "p4",
          productName: "Keg Beer",
          variantId: "v5",
          volume: "Per Glass",
          qty: 3,
          unitPrice: 80,
          lineTotal: 240
        },
        {
          productId: "p3",
          productName: "Smirnoff Red",
          variantId: "v4",
          volume: "750ml",
          qty: 1,
          unitPrice: 1800,
          lineTotal: 1800
        }
      ]
    }
  ],
  deliveries: [],
  cart: []
};
