module.exports = {
  apps: [
    {
      name: "dashboard-rutina360",
      script: "npm",
      args: "start -- -H 127.0.0.1 -p 3001",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        API_BASE_URL: "http://localhost:5000",
      }
    }
  ]
};
