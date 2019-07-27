module.exports = {
  entry: "./app.js",
  output: {
      path: __dirname + "/build/app/js",
      filename: "app.js"
  },
  module: {
      rules: []
  }
};