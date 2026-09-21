resource "digitalocean_droplet" "cms" {
  name       = var.droplet_name
  region     = var.region
  size       = var.droplet_size
  image      = "ubuntu-24-04-x64"
  ssh_keys   = [var.ssh_key_id]
  monitoring = true
  backups    = true
  backup_policy {
    plan = "daily"
    hour = 20
  }
  ipv6 = true
  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    deploy_user = var.deploy_user
  })
  tags = ["dgtl-cms", var.environment]
}

resource "digitalocean_firewall" "cms" {
  name        = "${var.droplet_name}-firewall"
  droplet_ids = [digitalocean_droplet.cms.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.allowed_ssh_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

resource "digitalocean_database_cluster" "cms" {
  name       = var.database_name
  engine     = "pg"
  version    = "16"
  region     = var.region
  size       = var.database_size
  node_count = 1
}

resource "digitalocean_database_db" "cms" {
  cluster_id = digitalocean_database_cluster.cms.id
  name       = "dgtl_cms"
}

resource "digitalocean_database_firewall" "cms" {
  cluster_id = digitalocean_database_cluster.cms.id

  rule {
    type  = "droplet"
    value = digitalocean_droplet.cms.id
  }
}

resource "cloudflare_dns_record" "cms" {
  zone_id = var.cloudflare_zone_id
  name    = var.cms_hostname
  type    = "A"
  content = digitalocean_droplet.cms.ipv4_address
  ttl     = 1
  proxied = true
}

resource "cloudflare_r2_bucket" "media" {
  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_name
}

resource "digitalocean_monitor_alert" "cpu" {
  alerts {
    email = [var.alert_email]
  }
  window      = "5m"
  type        = "v1/insights/droplet/cpu"
  compare     = "GreaterThan"
  value       = 85
  enabled     = true
  entities    = [digitalocean_droplet.cms.id]
  description = "${var.environment} CMS CPU above 85% for five minutes"
}

resource "digitalocean_monitor_alert" "memory" {
  alerts {
    email = [var.alert_email]
  }
  window      = "5m"
  type        = "v1/insights/droplet/memory_utilization_percent"
  compare     = "GreaterThan"
  value       = 85
  enabled     = true
  entities    = [digitalocean_droplet.cms.id]
  description = "${var.environment} CMS memory above 85% for five minutes"
}

resource "digitalocean_monitor_alert" "disk" {
  alerts {
    email = [var.alert_email]
  }
  window      = "5m"
  type        = "v1/insights/droplet/disk_utilization_percent"
  compare     = "GreaterThan"
  value       = 80
  enabled     = true
  entities    = [digitalocean_droplet.cms.id]
  description = "${var.environment} CMS disk above 80% for five minutes"
}

resource "digitalocean_uptime_check" "cms" {
  name    = "${var.environment}-cms-health"
  target  = "https://${var.cms_hostname}/api/health"
  type    = "https"
  regions = ["se_asia", "eu_west", "us_east"]
  enabled = true

  depends_on = [cloudflare_dns_record.cms]
}

resource "digitalocean_uptime_alert" "cms_down" {
  check_id = digitalocean_uptime_check.cms.id
  name     = "${var.environment}-cms-globally-down"
  type     = "down_global"
  period   = "2m"

  notifications {
    email = [var.alert_email]
  }
}

resource "digitalocean_uptime_alert" "cms_latency" {
  check_id   = digitalocean_uptime_check.cms.id
  name       = "${var.environment}-cms-high-latency"
  type       = "latency"
  threshold  = 2000
  comparison = "greater_than"
  period     = "5m"

  notifications {
    email = [var.alert_email]
  }
}

resource "digitalocean_uptime_alert" "cms_tls_expiry" {
  check_id   = digitalocean_uptime_check.cms.id
  name       = "${var.environment}-cms-tls-expiry"
  type       = "ssl_expiry"
  threshold  = 14
  comparison = "less_than"
  period     = "1h"

  notifications {
    email = [var.alert_email]
  }
}
