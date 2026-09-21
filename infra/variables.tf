variable "digitalocean_token" {
  type        = string
  sensitive   = true
  description = "DigitalOcean API token. Pass through a secret store."
}

variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Cloudflare API token with only required zone/DNS and R2 permissions."
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID used by the R2 bucket."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Zone ID for dgtl.lk."
}

variable "region" {
  type        = string
  description = "DigitalOcean region for the Droplet and managed PostgreSQL cluster."
}

variable "environment" {
  type        = string
  default     = "staging"
  description = "Deployment environment recorded in names, tags, and monitoring descriptions."

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "deploy_user" {
  type        = string
  default     = "dgtl-deploy"
  description = "Dedicated non-root SSH and deployment account created by cloud-init."

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_-]{0,30}$", var.deploy_user))
    error_message = "deploy_user must be a valid Linux account name."
  }
}

variable "alert_email" {
  type        = string
  description = "DigitalOcean-verified operator address for resource, uptime, and TLS alerts."

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "alert_email must be a valid email address."
  }
}

variable "droplet_name" {
  type    = string
  default = "dgtl-cms-staging"
}

variable "droplet_size" {
  type        = string
  default     = "s-4vcpu-8gb"
  description = "8 GB is the minimum recommended when ClamAV runs on the same host."
}

variable "ssh_key_id" {
  type        = string
  description = "Existing DigitalOcean SSH key ID or fingerprint."
}

variable "database_name" {
  type    = string
  default = "dgtl-cms-staging-db"
}

variable "database_size" {
  type        = string
  default     = "db-s-1vcpu-1gb"
  description = "Managed PostgreSQL size for initial staging."
}

variable "cms_hostname" {
  type    = string
  default = "cms-staging.dgtl.lk"
}

variable "r2_bucket_name" {
  type    = string
  default = "dgtl-cms-staging-media"
}

variable "allowed_ssh_cidrs" {
  type        = list(string)
  description = "Trusted operator/GitHub runner CIDRs. Do not use 0.0.0.0/0."
}
