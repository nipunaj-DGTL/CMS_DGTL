output "droplet_id" {
  value = digitalocean_droplet.cms.id
}

output "vpc_id" {
  value = digitalocean_vpc.cms.id
}

output "droplet_ipv4" {
  value = digitalocean_droplet.cms.ipv4_address
}

output "cms_hostname" {
  value = var.cms_hostname
}

output "database_host" {
  value = digitalocean_database_cluster.cms.host
}

output "database_port" {
  value = digitalocean_database_cluster.cms.port
}

output "database_name" {
  value = digitalocean_database_db.cms.name
}

output "r2_bucket_name" {
  value = cloudflare_r2_bucket.media.name
}

output "deploy_user" {
  value = var.deploy_user
}

output "cms_uptime_check_id" {
  value = digitalocean_uptime_check.cms.id
}
