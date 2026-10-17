variable "project_id" {
  description = "Existing authorized project; no project or API is created here."
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Use a valid Google Cloud project ID."
  }
}

variable "region" {
  description = "Region selected after residency, availability and budget review."
  type        = string
}

variable "prefix" {
  description = "Resource prefix, not a tenant identifier or secret."
  type        = string
  default     = "proofkit-lab"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,18}[a-z0-9]$", var.prefix))
    error_message = "Prefix must contain 4-20 lowercase letters, digits or hyphens."
  }
}

variable "subnet_cidrs" {
  description = "Two non-overlapping private IPv4 ranges; actual overlaps require deployment review."
  type = object({
    prover   = string
    verifier = string
  })
  default = {
    prover   = "10.81.1.0/24"
    verifier = "10.81.2.0/24"
  }
}
