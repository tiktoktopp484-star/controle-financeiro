-- Fix: add all columns that might be missing from previous failed migrations
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255);
ALTER TABLE `users` ADD `premium` boolean DEFAULT false NOT NULL;
ALTER TABLE `users` ADD `premiumUntil` timestamp NULL;
ALTER TABLE `users` ADD `trialUsed` boolean DEFAULT false NOT NULL;
ALTER TABLE `users` ADD `asaasCustomerId` varchar(64);
ALTER TABLE `users` ADD `asaasSubscriptionId` varchar(64);
