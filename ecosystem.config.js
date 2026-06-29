module.exports = {
  apps: [{
    name: "learn-music",
    script: "index.js",
    watch: false,
    instances: 1,
    autorestart: true,
    max_memory_restart: "300M"
  }]
}