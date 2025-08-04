-- Create places table for landmarks, restaurants, and points of interest
CREATE TABLE public.places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  category TEXT NOT NULL, -- restaurant, landmark, hotel, etc.
  subcategory TEXT, -- pizza, italian, hospital, etc.
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to places
CREATE POLICY "Places are publicly viewable" 
ON public.places 
FOR SELECT 
USING (true);

-- Create indexes for better search performance
CREATE INDEX idx_places_name ON public.places USING gin(to_tsvector('english', name));
CREATE INDEX idx_places_category ON public.places (category);
CREATE INDEX idx_places_location ON public.places (latitude, longitude);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert all the places data
INSERT INTO public.places (name, address, category, subcategory, latitude, longitude) VALUES
-- City areas
('Downtown Manhattan', 'Downtown Area, Manhattan, NY', 'area', 'business', 40.7589, -73.9851),
('JFK Airport', 'Queens, NY 11430', 'transportation', 'airport', 40.6413, -73.7781),
('Brooklyn', 'Brooklyn, NY', 'area', 'residential', 40.6782, -73.9442),
('Queens', 'Queens, NY', 'area', 'residential', 40.7282, -73.7949),
('Manhattan', 'Manhattan, NY', 'area', 'business', 40.7831, -73.9712),
('Times Square', '1560 Broadway, New York, NY 10036', 'landmark', 'entertainment', 40.7580, -73.9855),
('Central Park', 'New York, NY 10024', 'landmark', 'park', 40.7829, -73.9654),
('Wall Street', 'Wall St, New York, NY 10005', 'area', 'financial', 40.7074, -74.0113),
('Chinatown', 'Chinatown, New York, NY', 'area', 'cultural', 40.7158, -73.9970),
('SoHo', 'SoHo, New York, NY', 'area', 'shopping', 40.7230, -74.0020),
('East Village', 'East Village, New York, NY', 'area', 'nightlife', 40.7265, -73.9815),
('West Village', 'West Village, New York, NY', 'area', 'dining', 40.7358, -74.0036),
('Upper East Side', 'Upper East Side, New York, NY', 'area', 'residential', 40.7736, -73.9566),
('Upper West Side', 'Upper West Side, New York, NY', 'area', 'residential', 40.7870, -73.9754),
('Tribeca', 'Tribeca, New York, NY', 'area', 'upscale', 40.7195, -74.0089),
('Chelsea', 'Chelsea, New York, NY', 'area', 'art', 40.7465, -73.9972),

-- Popular restaurants
('Joe''s Pizza', '7 Carmine St, New York, NY 10014', 'restaurant', 'pizza', 40.7505, -73.9934),
('Shake Shack', '691 8th Ave, New York, NY 10036', 'restaurant', 'burger', 40.7414, -73.9887),
('Katz''s Delicatessen', '205 E Houston St, New York, NY 10002', 'restaurant', 'deli', 40.7223, -73.9873),
('McDonald''s Times Square', '1560 Broadway, New York, NY 10036', 'restaurant', 'fast_food', 40.7505, -73.9860),
('Starbucks Herald Square', '1285 Broadway, New York, NY 10001', 'restaurant', 'coffee', 40.7549, -73.9840),
('Whole Foods Market', '95 E Houston St, New York, NY 10002', 'grocery', 'organic', 40.7614, -73.9776),
('Trader Joe''s Union Square', '142 E 14th St, New York, NY 10003', 'grocery', 'specialty', 40.7505, -73.9880),

-- Major retailers
('Target Herald Square', '1328 Broadway, New York, NY 10001', 'shopping', 'department', 40.7282, -73.9942),
('Walmart Supercenter', '2328 Forest Ave, Staten Island, NY 10303', 'shopping', 'department', 40.6892, -74.1776),
('Home Depot', '40 W 23rd St, New York, NY 10010', 'shopping', 'hardware', 40.7348, -73.9830),
('Best Buy Union Square', '52 E 14th St, New York, NY 10003', 'shopping', 'electronics', 40.7505, -73.9900),

-- Hotels
('Marriott Marquis', '1535 Broadway, New York, NY 10036', 'hotel', 'luxury', 40.7505, -73.9857),
('Hilton Garden Inn', '136 E 42nd St, New York, NY 10017', 'hotel', 'business', 40.7614, -73.9776),
('Hyatt Grand Central', '109 E 42nd St, New York, NY 10017', 'hotel', 'luxury', 40.7505, -73.9820),
('Holiday Inn Express', '232 W 29th St, New York, NY 10001', 'hotel', 'budget', 40.7505, -73.9880),

-- Landmarks and attractions
('Empire State Building', '20 W 34th St, New York, NY 10001', 'landmark', 'observation', 40.7484, -73.9857),
('Statue of Liberty', 'Liberty Island, New York, NY 10004', 'landmark', 'monument', 40.6892, -74.0445),
('Brooklyn Bridge', 'Brooklyn Bridge, New York, NY 10038', 'landmark', 'bridge', 40.7061, -73.9969),
('High Line', 'High Line, New York, NY 10011', 'landmark', 'park', 40.7480, -74.0048),
('Madison Square Garden', '4 Pennsylvania Plaza, New York, NY 10001', 'entertainment', 'arena', 40.7505, -73.9934),
('Yankee Stadium', '1 E 161st St, Bronx, NY 10451', 'entertainment', 'stadium', 40.8296, -73.9262),
('Citi Field', '123-01 Roosevelt Ave, Queens, NY 11368', 'entertainment', 'stadium', 40.7571, -73.8458),
('Lincoln Center', '10 Lincoln Center Plaza, New York, NY 10023', 'entertainment', 'theater', 40.7722, -73.9838),
('Grand Central Terminal', '89 E 42nd St, New York, NY 10017', 'transportation', 'train', 40.7527, -73.9772),
('Penn Station', '4 Pennsylvania Plaza, New York, NY 10001', 'transportation', 'train', 40.7505, -73.9934),

-- Universities
('New York University', '4 Washington Square N, New York, NY 10003', 'education', 'university', 40.7295, -73.9965),
('Columbia University', '116th St & Broadway, New York, NY 10027', 'education', 'university', 40.8075, -73.9626),
('Fordham University', '441 E Fordham Rd, Bronx, NY 10458', 'education', 'university', 40.8616, -73.8875),

-- Hospitals
('Mount Sinai Hospital', '1 Gustave L. Levy Pl, New York, NY 10029', 'healthcare', 'hospital', 40.7903, -73.9505),
('NYU Langone Health', '550 1st Ave, New York, NY 10016', 'healthcare', 'hospital', 40.7391, -73.9719),
('NewYork-Presbyterian', '622 W 168th St, New York, NY 10032', 'healthcare', 'hospital', 40.8422, -73.9431),

-- Shopping
('Macy''s Herald Square', '151 W 34th St, New York, NY 10001', 'shopping', 'department', 40.7505, -73.9898),
('Bloomingdale''s', '1000 3rd Ave, New York, NY 10022', 'shopping', 'luxury', 40.7614, -73.9776),
('Saks Fifth Avenue', '611 5th Ave, New York, NY 10022', 'shopping', 'luxury', 40.7585, -73.9776),
('Bergdorf Goodman', '754 5th Ave, New York, NY 10019', 'shopping', 'luxury', 40.7614, -73.9741);

-- Add full-text search configuration
CREATE INDEX idx_places_search ON public.places USING gin(
  (setweight(to_tsvector('english', name), 'A') ||
   setweight(to_tsvector('english', coalesce(address, '')), 'B') ||
   setweight(to_tsvector('english', category), 'C') ||
   setweight(to_tsvector('english', coalesce(subcategory, '')), 'D'))
);