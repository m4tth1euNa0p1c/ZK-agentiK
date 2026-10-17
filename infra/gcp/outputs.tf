output "network_id" {
  value = google_compute_network.foundation.id
}

output "service_accounts_without_permissions" {
  value = { for role, account in google_service_account.role : role => account.email }
}
