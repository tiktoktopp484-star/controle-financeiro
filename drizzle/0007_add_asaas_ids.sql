ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asaasCustomerId` varchar(64);
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asaasSubscriptionId` varchar(64);