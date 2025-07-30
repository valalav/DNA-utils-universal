module.exports = {
  apps: [{
    name: "haplo-client",
    cwd: "/root/ftdna_haplo/client",
    script: "npm",
    args: "run dev",
    env: {
      NODE_ENV: "production",
    }
  },
  {
    name: "haplo-server", 
    cwd: "/root/ftdna_haplo/server",
    script: "server.js",
    env: {
      NODE_ENV: "production",
      PORT: 4000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}