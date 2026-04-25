const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle multipart responses
config.resolver.platforms = ['native', 'web', 'android', 'ios'];

// Configure transformer to handle bundle splitting
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    mangle: {
      keep_fnames: false,
    },
  },
};

// Add server configuration
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Handle multipart responses properly
      res.setHeader('Accept-Ranges', 'bytes');
      return middleware(req, res, next);
    };
  },
};

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;