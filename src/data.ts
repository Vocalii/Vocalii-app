import { Destination } from './types';

export const DESTINATIONS: Destination[] = [
  {
    id: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    description: 'Santorini is a beautiful city located in the Aegean Sea, in Greece. It is known for its stunning views of the sea, the white-washed buildings, and the blue-domed churches.',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=150&q=80', // Oia domes
      'https://images.unsplash.com/photo-1469796466635-455ede028ace?auto=format&fit=crop&w=150&q=80', // Blue chair sunset
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=150&q=80', // Cave pool
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=150&q=80', // Coastal alley
    ],
    basePriceMin: 1581,
    basePriceMax: 3162,
    weatherTemp: 28,
    weatherStatus: 'sunny',
    activeMonth: 'Jun',
    monthlyBusy: [
      { month: 'Apr', value: 30 },
      { month: 'May', value: 50 },
      { month: 'Jun', value: 85, isActive: true },
      { month: 'Jul', value: 95 },
      { month: 'Aug', value: 100 },
      { month: 'Sep', value: 75 },
    ],
    monthlyPrices: [1200, 1500, 1850, 2200, 2400, 1600],
    attractions: [
      {
        id: 'ancient-thera',
        name: 'Ancient Thera',
        type: 'sight',
        x: 65,
        y: 68,
        description: 'An antique city on a ridge of the steep, 360m high Messavouno mountain. It was named after the mythical ruler of the island, Theras.',
        rating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1601581874834-3b6065645e07?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'oia-sunset',
        name: 'Oia Sunset Point',
        type: 'sight',
        x: 20,
        y: 25,
        description: 'The world-famous vantage point to watch the orange sun sink slowly beneath the Aegean Sea rimmed by high cliffs.',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'grace-hotel',
        name: 'Grace Boutique Hotel',
        type: 'hotel',
        x: 42,
        y: 45,
        description: 'A gorgeous, cliff-carved luxury boutique resort with an award-winning infinity pool facing the active volcano caldera.',
        rating: 4.95,
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'selene-restaurant',
        name: 'Selene Fine Dining',
        type: 'food',
        x: 48,
        y: 52,
        description: 'Located in a historic monastery, Selene offers a spectacular modern tasting menu based on local volcanic ingredients.',
        rating: 4.7,
        imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'fira-cafe',
        name: 'Volkan on the Rocks',
        type: 'cafe',
        x: 45,
        y: 49,
        description: 'Great locally roasted coffee and refreshing volcanic beers with prime seating right over the Caldera edge.',
        rating: 4.6,
        imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'kamari-beach',
        name: 'Kamari Black Beach',
        type: 'sight',
        x: 72,
        y: 55,
        description: 'A beautiful coastal strip composed of volcanic black sand and pebbles, featuring a bustling lively promenade.',
        rating: 4.5,
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    description: 'Kyoto, once the capital of Japan, is a city on the island of Honshu. It is famous for its thousands of classical Buddhist temples, gardens, imperial palaces, Shinto shrines and traditional wooden houses.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=150&q=80', // Bamboo forest
      'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=150&q=80', // Golden Pavilion
      'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=150&q=80', // Cherry blossom Gion
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=150&q=80', // Lanterns
    ],
    basePriceMin: 1845,
    basePriceMax: 3670,
    weatherTemp: 22,
    weatherStatus: 'cloudy',
    activeMonth: 'Apr',
    monthlyBusy: [
      { month: 'Mar', value: 75 },
      { month: 'Apr', value: 100, isActive: true },
      { month: 'May', value: 65 },
      { month: 'Oct', value: 70 },
      { month: 'Nov', value: 90 },
      { month: 'Dec', value: 50 },
    ],
    monthlyPrices: [1500, 2000, 1600, 1400, 1900, 1200],
    attractions: [
      {
        id: 'fushimi-inari',
        name: 'Fushimi Inari-taisha',
        type: 'sight',
        x: 50,
        y: 80,
        description: 'An important Shinto shrine in southern Kyoto. It is famous for its path of over 10,000 vibrant red torii gates winding up Mount Inari.',
        rating: 4.95,
        imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'kinkaku-ji',
        name: 'Kinkaku-ji (Golden Pavilion)',
        type: 'sight',
        x: 25,
        y: 20,
        description: 'A Zen Buddhist temple whose top two floors are completely covered in brilliant gold leaf, reflecting over the Mirror Pond.',
        rating: 4.85,
        imageUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'sowaka-ryokan',
        name: 'Sowaka Luxury Ryokan',
        type: 'hotel',
        x: 60,
        y: 50,
        description: 'A beautifully restored traditional high-concept Sukiya-style estate offering top-tier Michelin-starred imperial hospitality.',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'gion-sasaki',
        name: 'Gion Sasaki Fine Dining',
        type: 'food',
        x: 55,
        y: 48,
        description: 'An incredible 3-Michelin-starred modern multi-course Kaiseki counter experience utilizing seasonal local Kyoto produce.',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1580442151529-343f2f5e0e37?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'arashiyama-bamboo',
        name: 'Arashiyama Bamboo Grove',
        type: 'sight',
        x: 10,
        y: 45,
        description: 'A soaring, lush sensory walk under thousands of towering, deep-green bamboo stalks whispering in the mountain breeze.',
        rating: 4.75,
        imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    description: 'Iceland’s coastal capital, Reykjavik, is home to the National and Saga museums, tracing Iceland’s Viking history. Its striking concrete Hallgrímskirkja church and rotating Perlan glass dome offer sweeping ocean and hill views.',
    imageUrl: 'https://images.unsplash.com/photo-1504829857797-ddff28127792?auto=format&fit=crop&w=1200&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?auto=format&fit=crop&w=150&q=80', // Aurora
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=150&q=80', // Blue Lagoon
      'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=150&q=80', // Ice Cave
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=150&q=80', // Mountain lake
    ],
    basePriceMin: 2200,
    basePriceMax: 4500,
    weatherTemp: 11,
    weatherStatus: 'rainy',
    activeMonth: 'Aug',
    monthlyBusy: [
      { month: 'Jun', value: 80 },
      { month: 'Jul', value: 95 },
      { month: 'Aug', value: 100, isActive: true },
      { month: 'Sep', value: 70 },
      { month: 'Dec', value: 60 },
      { month: 'Jan', value: 50 },
    ],
    monthlyPrices: [1800, 2200, 2500, 1900, 1700, 1400],
    attractions: [
      {
        id: 'blue-lagoon',
        name: 'Blue Lagoon Spa',
        type: 'sight',
        x: 15,
        y: 75,
        description: 'A geothermal, mineral-rich milky blue pool heated to 38°C amid pitch-black charcoal lava fields.',
        rating: 4.88,
        imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'hallgrimskirkja',
        name: 'Hallgrímskirkja Church',
        type: 'sight',
        x: 52,
        y: 47,
        description: 'A soaring, expressionist-style concrete church designed to mimic the cooling flows of basalt lava columns.',
        rating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1504829857797-ddff28127792?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'edition-hotel',
        name: 'The Reykjavik EDITION',
        type: 'hotel',
        x: 48,
        y: 35,
        description: 'A state-of-the-art five-star harbor-side hotel offering beautiful harbor views, elegant dining, and a deep-wood luxury spa.',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'dill-dining',
        name: 'DILL Restaurant',
        type: 'food',
        x: 55,
        y: 40,
        description: 'The first Icelandic restaurant awarded a Michelin star, DILL delivers a hyper-pure experimental Nordic tasting experience.',
        rating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'amalfi',
    name: 'Amalfi Coast',
    country: 'Italy',
    description: 'The Amalfi Coast is a 50-kilometer stretch of coastline along the southern edge of Italy’s Sorrentine Peninsula, in the Campania region. It’s a popular holiday destination, with sheer cliffs and a rugged shoreline dotted with small beaches and pastel-colored fishing villages.',
    imageUrl: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=80',
    thumbnails: [
      'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?auto=format&fit=crop&w=150&q=80', // Sea balcony
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=150&q=80', // Coastal cliff Positano
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=150&q=80', // Lemon tree hotel
      'https://images.unsplash.com/photo-1491557348775-e4ecd942b8fb?auto=format&fit=crop&w=150&q=80', // Boat in cove
    ],
    basePriceMin: 2100,
    basePriceMax: 4250,
    weatherTemp: 26,
    weatherStatus: 'sunny',
    activeMonth: 'Jul',
    monthlyBusy: [
      { month: 'May', value: 60 },
      { month: 'Jun', value: 85 },
      { month: 'Jul', value: 100, isActive: true },
      { month: 'Aug', value: 98 },
      { month: 'Sep', value: 80 },
      { month: 'Oct', value: 45 },
    ],
    monthlyPrices: [1600, 2000, 2400, 2300, 1800, 1300],
    attractions: [
      {
        id: 'positano-cliff',
        name: 'Positano Viewpoint',
        type: 'sight',
        x: 22,
        y: 40,
        description: 'The sweeping, epic overlook where terracotta, pastel pink, and saffron yellow villas cascade vertically into the cobalt blue Mediterranean.',
        rating: 4.95,
        imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'le-sirenuse',
        name: 'Le Sirenuse Hotel',
        type: 'hotel',
        x: 25,
        y: 44,
        description: 'An iconic family-run 18th-century luxury palace decorated with ancient tiles, lemon plants, and premium seaside terraces overlooking Positano bay.',
        rating: 4.99,
        imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'don-alfonso',
        name: 'Don Alfonso 1890',
        type: 'food',
        x: 12,
        y: 50,
        description: 'Two-Michelin-starred estate representing the vibrant culture, fresh fish, lemons, and wine of Italy’s glorious Campania region.',
        rating: 4.85,
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'villa-cimbrone',
        name: 'Villa Cimbrone Gardens',
        type: 'sight',
        x: 75,
        y: 35,
        description: 'A historic 11th-century villa in Ravello famous for its breathtaking "Terrace of Infinity" decorated with marble busts showing spectacular views.',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?auto=format&fit=crop&w=400&q=80'
      }
    ]
  }
];
