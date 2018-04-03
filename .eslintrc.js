module.exports = {
  "extends": "airbnb-base",
  "plugins": [
    "import"
  ],
  "env" : {
    "node" : true,
  },
  "rules" : {
    "padded-blocks": "off",
    "indent": ["error", 2],
    "comma-dangle" : ["error", "always-multiline"],
    "key-spacing": ["warn", {
      "singleLine": {
        "beforeColon": true,
        "afterColon": true
      },
      "multiLine": {
        "beforeColon": true,
        "afterColon": true,
        "mode" : "minimum"
      }
    }],
    "no-use-before-define": ["error", {
      "functions": false
    }],
    "no-param-reassign": ["error", { "props": false }],
    "max-len": ["warn", 120],
    "no-underscore-dangle": ["error", {
      "allowAfterThis": true
    }],
    "quotes" : ["error", "single", { "allowTemplateLiterals": true }],
    "no-underscore-dangle" : "off",
    "arrow-parens" : "off",
    "arrow-body-style" : "off",
  },
};
