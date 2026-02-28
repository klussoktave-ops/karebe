const seed = {
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
      name: "Karebe Owner",
      username: "owner",
      password: "owner1234",
      role: "super-admin",
      phone: "+254700123456",
      branchId: null,
      active: true
    },
    {
      id: "u_wangige_admin",
      name: "Wangige Manager",
      username: "karebe",
      password: "karebe1234",
      role: "admin",
      phone: "+254701111111",
      branchId: "b_wangige",
      active: true
    },
    {
      id: "u_karura_admin",
      name: "Karura Manager",
      username: "karuraadmin",
      password: "karura1234",
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
  taxonomies: {
    categories: ["Wine", "Whiskey", "Vodka", "Gin", "Champagne", "Local Spirits", "Keg"],
    paymentStatuses: ["PENDING", "PAID"],
    deliveryStatuses: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"],
    orderSources: ["CALL", "SMS", "WHATSAPP"]
  },
  categories: ["Wine", "Whiskey", "Vodka", "Gin", "Champagne", "Local Spirits", "Keg"],
  products: [
    {
      id: "p1",
      name: "Nederburg Cabernet",
      category: "Wine",
      description: "Dry red wine with bold berry notes.",
      image:
        "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=700&q=70",
      popular: true,
      newArrival: false,
      variants: [{ id: "v1", volume: "750ml", price: 2400, stock: 22 }]
    },
    {
      id: "p2",
      name: "Jameson Irish Whiskey",
      category: "Whiskey",
      description: "Smooth triple-distilled classic.",
      image:
        "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=700&q=70",
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
      image:
        "https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg?auto=compress&cs=tinysrgb&w=800",
      popular: false,
      newArrival: false,
      variants: [{ id: "v4", volume: "750ml", price: 1800, stock: 30 }]
    },
    {
      id: "p4",
      name: "Keg Beer",
      category: "Keg",
      description: "Freshly tapped keg, perfect for chill sessions.",
      image:
        "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg?auto=compress&cs=tinysrgb&w=800",
      popular: true,
      newArrival: true,
      variants: [{ id: "v5", volume: "Per Glass", price: 80, stock: 500 }]
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
  orders: [],
  deliveries: [],
  cart: []
};

module.exports = { seed };
