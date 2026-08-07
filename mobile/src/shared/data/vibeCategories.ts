// Ported 1:1 from the prototype (lines 356–369).
export const vibeCategories = [
  { name: 'Food & Drink', icon: '🍴', vibes: ['Chai Lover', 'Foodie', 'Coffee Snob', 'Biryani Hunter', 'Street Food', 'Home Chef', 'Vegan', 'Dessert Fan', 'Filter Coffee', 'Pao Bhaji Fan', 'Momo Lover', 'Paratha Person', 'South Indian', 'North Indian', 'Maharashtrian Thali', 'Bengali Sweets', 'Pure Veg', 'Non-Veg', 'Jain Food', 'Keto', 'Bakery Hopper', 'Cocktail Mixer'] },
  { name: 'Hobbies', icon: '🎮', vibes: ['Gamer', 'Bookworm', 'Photographer', 'Music Buff', 'Anime Fan', 'Crafter', 'Cinephile', 'Painter', 'Sketcher', 'Calligraphy', 'DIY-er', 'Lego Builder', 'Board Games', 'Chess Player', 'Sudoku Solver', 'Writer', 'Poet', 'Stand-up Fan', 'Vinyl Collector', 'Karaoke Star', 'Manga Reader', 'Sci-Fi Geek'] },
  { name: 'Lifestyle', icon: '✨', vibes: ['Plant Parent', 'Pet Parent', 'Late Night Owl', 'Early Bird', 'Minimalist', 'Maximalist', 'Homebody', 'Party Person', 'Solo Diner', 'Bullet Journal', 'Thrift Shopper', 'Sneakerhead', 'Skincare Nerd', 'Tea over Coffee', 'Notion User', 'Apple Person', 'Android Loyal'] },
  { name: 'Fitness', icon: '💪', vibes: ['Fitness Freak', 'Yoga Vibes', 'Runner', 'Cyclist', 'Trekker', 'Gym Rat', 'Cricketer', 'Footballer', 'Badminton Player', 'Tennis Player', 'Swimmer', 'CrossFitter', 'Zumba', 'Pilates', 'Calisthenics', 'Mountain Climber', 'Marathoner'] },
  { name: 'Mind & Soul', icon: '🔮', vibes: ['Astrology Believer', 'Spiritual', 'Introvert', 'Extrovert', 'Ambivert', 'Workaholic', 'Wanderer', 'Dreamer', 'Meditator', 'Tarot Curious', 'Manifesting', 'Therapy-positive', 'Stoic', 'Optimist', 'Realist', 'Numerology Fan'] },
  { name: 'Community', icon: '🤝', vibes: ['Helper', 'Organizer', 'Local Guide', 'Volunteer', 'Mentor', 'Connector', 'Society Office-bearer', 'RWA Member', 'Blood Donor', 'Stray Feeder', 'Eco Warrior', 'Composting Crew', 'Neighbourhood Watch'] },
  { name: 'Work & Hustle', icon: '💼', vibes: ['Founder', 'Freelancer', 'Side-hustler', 'Engineer', 'Designer', 'Marketer', 'PM', 'Sales', 'HR', 'Finance', 'Lawyer', 'Doctor', 'Teacher', 'Student', 'Remote Worker', 'Office Grind', 'Consultant', 'Investor'] },
  { name: 'Family & Home', icon: '🏠', vibes: ['New Parent', 'Toddler Parent', 'Teen Parent', 'Empty Nester', 'Newlywed', 'Single & Happy', 'Joint Family', 'Newcomer in city', 'Senior Citizen', 'Caregiver', 'NRI Returned'] },
  { name: 'Travel & Outdoors', icon: '🌍', vibes: ['Road Tripper', 'Backpacker', 'Solo Traveller', 'Beach Person', 'Mountain Person', 'Camping Crew', 'Birdwatcher', 'Stargazer', 'Tier-2 Explorer', 'International Hopper'] },
] as const;

export const flatVibes = vibeCategories.flatMap((c) => c.vibes);
export const MIN_VIBES = 3;
