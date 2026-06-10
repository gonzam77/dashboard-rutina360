module.exports = {
  apps: [
    {
      name: "mi-app",
      script: "npm",
      args: "start -- -p 3001",
      cwd: "/ruta/a/tu/proyecto",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};