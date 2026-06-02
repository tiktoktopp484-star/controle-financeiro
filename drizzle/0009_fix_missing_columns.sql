-- Fix: add all columns that might be missing from previous failed migrations
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `premium` boolean DEFAULT false NOT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `premiumUntil` timestamp NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `trialUsed` boolean DEFAULT false NOT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asaasCustomerId` varchar(64);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asaasSubscriptionId` varchar(64);
