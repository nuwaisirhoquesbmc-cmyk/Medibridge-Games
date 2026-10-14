-- MediBridge Games: Direct PostgreSQL Seed Script
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. COURSES
INSERT INTO public.courses (id, title, description, thumbnail_url, price, discount_price, is_published, features)
VALUES ('course_med_2027', 'Medical Standard Exam Batch 2027', 'বাংলাদেশ সেরা মেডিকেল কলেজগুলোতে চান্স পাওয়ার জন্য সম্পূর্ণ অধ্যায়ভিত্তিক ও সাবজেক্টভিত্তিক মডেল টেস্ট প্রোগ্রাম।', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60', 12000, 6990, true, ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price = EXCLUDED.price, discount_price = EXCLUDED.discount_price;
INSERT INTO public.courses (id, title, description, thumbnail_url, price, discount_price, is_published, features)
VALUES ('course_mat_revision', 'MAT Final Crack & Crash Revision Batch', 'শেষ মুহূর্তের ১০০ দিনের সুপার ফাস্ট রিভিশন, শর্টকাট টেকনিক ও ৩০টি মেগা ফাইনাল মডেল টেস্ট।', 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=60', 8000, 4990, true, ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price = EXCLUDED.price, discount_price = EXCLUDED.discount_price;
INSERT INTO public.courses (id, title, description, thumbnail_url, price, discount_price, is_published, features)
VALUES ('course_bio_mastery', 'Medical Biology 100% Mastery & Mnemonics Program', 'বোটানি ও জুলজির প্রতিটি অধ্যায়ের লাইন-বাই-লাইন ডিকোড ও মনে রাখার বিশেষ নিউমোনিক পদ্ধতি।', 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=60', 5000, 2990, true, ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price = EXCLUDED.price, discount_price = EXCLUDED.discount_price;

-- 2. BATCHES
INSERT INTO public.batches (source_id, course_id, name, description, max_students, status)
VALUES ('batch_2027_alpha', 'course_med_2027', 'Medical Batch', '', 500, 'active')
ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.batches (source_id, course_id, name, description, max_students, status)
VALUES ('batch_2026_rev', 'course_med_2026', 'Medical Batch', '', 500, 'active')
ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.batches (source_id, course_id, name, description, max_students, status)
VALUES ('batch_bio_master', 'course_bio_mastery', 'Medical Batch', '', 500, 'active')
ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

-- 3. NOTICES
INSERT INTO public.notices (title, body, type, is_active)
VALUES 
('মেডিকেল ভর্তি প্রস্তুতি ২০২৩-২০২৪ ওরিয়েন্টেশন', 'সকল মেডিকেল প্রত্যাশী শিক্ষার্থীদের জন্য নতুন লাইভ ব্যাচ ও এক্সাম সেশন শুরু হতে যাচ্ছে।', 'announcement', true),
('ডেইলি স্পিড এক্সাম লাইভ', 'প্রতিদিন রাত ৯টায় মেডিকেলের স্পেশাল মডেল টেস্ট অনুষ্ঠিত হবে।', 'exam_alert', true)
ON CONFLICT DO NOTHING;
