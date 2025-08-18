-- Insert sample profiles for testing
INSERT INTO public.profiles (user_id, email, full_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'john.doe@example.com', 'John Doe'),
  ('22222222-2222-2222-2222-222222222222', 'jane.smith@example.com', 'Jane Smith'),
  ('33333333-3333-3333-3333-333333333333', 'mike.wilson@example.com', 'Mike Wilson'),
  ('44444444-4444-4444-4444-444444444444', 'sarah.johnson@example.com', 'Sarah Johnson')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample parking spots
INSERT INTO public.parking_spots (id, owner_id, title, address, description, price_per_hour, latitude, longitude, spot_type, is_active) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Downtown Garage Spot', '123 Main St, City Center', 'Covered parking spot in secure garage', 15.00, 40.7128, -74.0060, 'garage', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Office Building Parking', '456 Business Ave, Downtown', 'Reserved parking spot near office buildings', 12.00, 40.7589, -73.9851, 'street', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample bookings with different statuses
INSERT INTO public.bookings (id, spot_id, renter_id, start_time, end_time, status, total_amount, payment_intent_id) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', now() - interval '2 days', now() - interval '2 days' + interval '3 hours', 'completed', 45.00, 'pi_test_completed_1'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', now() - interval '1 day', now() - interval '1 day' + interval '2 hours', 'confirmed', 24.00, 'pi_test_confirmed_1'),
  ('gggggggg-gggg-gggg-gggg-gggggggggggg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', now() + interval '1 hour', now() + interval '4 hours', 'pending', 45.00, 'pi_test_pending_1')
ON CONFLICT (id) DO NOTHING;

-- Insert sample disputes
INSERT INTO public.disputes (id, booking_id, reporter_id, dispute_type, description, status, photo_url) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'damage_claim', 'Vehicle was scratched during parking. Found damage when returning to car.', 'pending', 'https://example.com/damage-photo.jpg'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'spot_unavailable', 'Parking spot was occupied by another vehicle when I arrived.', 'resolved', 'https://example.com/occupied-spot.jpg')
ON CONFLICT (id) DO NOTHING;

-- Insert sample refunds
INSERT INTO public.refunds (id, booking_id, user_id, amount, reason, status, admin_notes) VALUES
  ('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 25.00, 'Spot was smaller than advertised, only used half the time', 'pending', NULL),
  ('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', 12.00, 'Had to leave early due to emergency', 'approved', 'Approved due to emergency circumstances')
ON CONFLICT (id) DO NOTHING;

-- Insert sample support tickets
INSERT INTO public.support_tickets (id, user_id, subject, message, category, priority, status) VALUES
  ('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '33333333-3333-3333-3333-333333333333', 'Payment Not Processed', 'My payment was charged but booking shows as pending. Please help resolve this issue.', 'payment', 'high', 'open'),
  ('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '44444444-4444-4444-4444-444444444444', 'App Login Issues', 'Cannot log into the mobile app, keeps showing error message.', 'technical', 'medium', 'in_progress'),
  ('llllllll-llll-llll-llll-llllllllllll', '22222222-2222-2222-2222-222222222222', 'Spot Listing Question', 'How do I update my parking spot availability schedule?', 'general', 'low', 'resolved')
ON CONFLICT (id) DO NOTHING;

-- Insert sample security audit logs
INSERT INTO public.security_audit_log (id, user_id, event_type, event_data, ip_address) VALUES
  ('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm', '33333333-3333-3333-3333-333333333333', 'login_attempt', '{"success": true, "method": "email"}', '192.168.1.100'),
  ('nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn', '44444444-4444-4444-4444-444444444444', 'failed_login', '{"success": false, "reason": "invalid_password", "attempts": 3}', '192.168.1.150'),
  ('oooooooo-oooo-oooo-oooo-oooooooooooo', '22222222-2222-2222-2222-222222222222', 'password_change', '{"success": true, "timestamp": "2024-01-15T10:30:00Z"}', '192.168.1.200'),
  ('pppppppp-pppp-pppp-pppp-pppppppppppp', NULL, 'suspicious_activity', '{"event": "multiple_failed_logins", "ip": "192.168.1.999", "count": 10}', '192.168.1.999')
ON CONFLICT (id) DO NOTHING;