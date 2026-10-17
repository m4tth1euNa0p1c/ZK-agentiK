resource "google_compute_network" "foundation" {
  name                            = "${var.prefix}-vpc"
  auto_create_subnetworks         = false
  routing_mode                    = "REGIONAL"
  delete_default_routes_on_create = true
}

resource "google_compute_subnetwork" "role" {
  for_each                 = var.subnet_cidrs
  name                     = "${var.prefix}-${each.key}"
  ip_cidr_range            = each.value
  network                  = google_compute_network.foundation.id
  region                   = var.region
  private_ip_google_access = false
  stack_type               = "IPV4_ONLY"
}

resource "google_compute_firewall" "deny_egress" {
  name               = "${var.prefix}-deny-egress"
  network            = google_compute_network.foundation.name
  direction          = "EGRESS"
  priority           = 1000
  destination_ranges = ["0.0.0.0/0"]
  deny { protocol = "all" }
}

resource "google_compute_firewall" "deny_ingress" {
  name          = "${var.prefix}-deny-ingress"
  network       = google_compute_network.foundation.name
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = ["0.0.0.0/0"]
  deny { protocol = "all" }
}

resource "google_service_account" "role" {
  for_each     = toset(["prover", "verifier"])
  account_id   = "${var.prefix}-${each.key}"
  display_name = "Proofkit laboratory ${each.key}; no granted roles"
}
