-- Temporarily set a test rating for one parking spot to verify rating display
UPDATE parking_spots 
SET rating = 4.5, total_reviews = 12 
WHERE id = '79d1a816-5a2c-4cc7-8629-045b89b93faa';