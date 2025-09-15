import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cors from 'cors';
import rateLimit from 'express-rate-limit';
import * as https from 'https';
import * as fs from 'fs';

import { AppModule } from './app.module';

/**
 * Bootstrap function - Initializes the Stellar Custody MVP Backend
 * 
 * Security Features:
 * - mTLS support for production
 * - Comprehensive security headers
 * - Rate limiting
 * - Input validation
 * - CORS configuration
 * - Swagger API documentation
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Load configuration
  const configService = new ConfigService();
  const port = configService.get('API_PORT', 3001);
  const nodeEnv = configService.get('NODE_ENV', 'development');
  const mtlsEnabled = configService.get('MTLS_ENABLED', 'false') === 'true';

  logger.log('🚀 Starting Stellar Custody MVP Backend...');
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`mTLS Enabled: ${mtlsEnabled}`);

  // Create HTTPS options for mTLS if enabled
  let httpsOptions = {};
  
  if (mtlsEnabled && nodeEnv === 'production') {
    try {
      httpsOptions = {
        // Server certificate
        cert: fs.readFileSync(configService.get('MTLS_SERVER_CERT_PATH')),
        key: fs.readFileSync(configService.get('MTLS_SERVER_KEY_PATH')),
        
        // CA certificate for client validation
        ca: fs.readFileSync(configService.get('MTLS_CA_CERT_PATH')),
        
        // Require client certificates (mutual authentication)
        requestCert: true,
        rejectUnauthorized: true,
        
        // Use TLS 1.3 for maximum security
        secureProtocol: 'TLSv1_3_method',
        ciphers: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384'
        ].join(':')
      };
      
      logger.log('✅ mTLS configuration loaded successfully');
    } catch (error) {
      logger.error('❌ Failed to load mTLS certificates:', error.message);
      if (nodeEnv === 'production') {
        process.exit(1);
      }
    }
  }

  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    httpsOptions: mtlsEnabled ? httpsOptions : undefined,
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/metrics']
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        frameAncestors: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'same-origin' }
  }));

  // Compression
  app.use(compression());

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      const allowedOrigins = configService.get('CORS_ORIGIN', '').split(',');
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: configService.get('CORS_CREDENTIALS', 'true') === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Client-Cert-CN', // For mTLS
      'X-Challenge-Hash'  // For OCRA-like
    ]
  }));

  // Rate limiting
  const rateLimiter = rateLimit({
    windowMs: parseInt(configService.get('RATE_LIMIT_WINDOW_MS', '900000')), // 15 minutes
    max: parseInt(configService.get('RATE_LIMIT_MAX_REQUESTS', '100')),
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  
  app.use(rateLimiter);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // Remove unknown properties
    forbidNonWhitelisted: false, // Allow unknown properties for now
    transform: true,          // Transform input to DTO types
    transformOptions: {
      enableImplicitConversion: true
    },
    disableErrorMessages: nodeEnv === 'production', // Hide validation details in production
    skipMissingProperties: false,
    skipNullProperties: false,
    skipUndefinedProperties: false
  }));

  // Swagger API Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Stellar Custody MVP API')
      .setDescription(`
        🔐 **Multi-Signature Custody System for Stellar Blockchain**
        
        ## Features
        - **3 Guardian System**: CEO, CFO, CTO with flexible thresholds
        - **HSM DINAMO Integration**: Hardware key protection with partitions
        - **OCRA-like Challenges**: Transaction-specific challenge-response
        - **mTLS Security**: Mutual TLS for production environments
        - **WhatsApp Notifications**: Real-time approval requests
        - **BIP32 HD Wallets**: Hierarchical deterministic key derivation
        
        ## Authentication
        - **TOTP**: Time-based One-Time Passwords
        - **Challenge-Response**: OCRA-like transaction-specific codes
        - **HSM Key Release**: TOTP authorizes HSM to release signing keys
        
        ## Multi-Sig Schemes
        - **2-of-3**: For transactions < 10,000 XLM
        - **3-of-3**: For transactions > 10,000 XLM or Cold Wallet access
        
        ## Wallet Hierarchy
        - **Cold Wallet**: Master at m/0' (95% of funds)
        - **Hot Wallet**: Derived at m/0'/0' (5% of funds)
        
        ---
        **⚠️ TESTNET ONLY**: This documentation shows testnet configuration
      `)
      .setVersion('1.0.0')
      .addTag('Authentication', 'User login and TOTP verification')
      .addTag('Guardians', '3-Guardian management (CEO, CFO, CTO)')
      .addTag('Wallets', 'BIP32 HD Wallet management (Cold/Hot hierarchy)')
      .addTag('Transactions', 'Multi-sig transaction processing')
      .addTag('Challenges', 'OCRA-like challenge-response system')
      .addTag('HSM', 'Hardware Security Module operations')
      .addTag('KYC', 'Know Your Customer onboarding')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header'
      }, 'JWT-auth')
      .addApiKey({
        type: 'apiKey',
        name: 'X-TOTP-Code',
        in: 'header',
        description: 'TOTP code for guardian actions'
      }, 'TOTP')
      .addApiKey({
        type: 'apiKey',
        name: 'X-Challenge-Response',
        in: 'header',
        description: 'OCRA-like challenge response code'
      }, 'Challenge')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey
    });
    
    SwaggerModule.setup('api', app, document, {
      customSiteTitle: 'Stellar Custody MVP API',
      customfavIcon: '/favicon.ico',
      customCss: `
        .topbar-wrapper .link { 
          content: "🔐 Stellar Custody MVP - Multi-Sig API"; 
        }
        .swagger-ui .topbar { 
          background-color: #1a1a1a; 
        }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showRequestHeaders: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 2
      }
    });

    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api`);
  }

  // mTLS certificate validation middleware (if enabled)
  if (mtlsEnabled) {
    app.use((req, res, next) => {
      const clientCert = req.connection.getPeerCertificate();
      
      if (!clientCert || !clientCert.subject) {
        logger.warn(`❌ mTLS: Client certificate required from ${req.ip}`);
        return res.status(401).json({ 
          error: 'Client certificate required',
          message: 'mTLS authentication failed'
        });
      }
      
      // Validate certificate subject
      const allowedSubjects = [
        'guardian-ceo',
        'guardian-cfo', 
        'guardian-cto',
        'hsm-dinamo-client',
        'admin-dashboard',
        'stellar-custody-backend'
      ];
      
      const isAuthorized = allowedSubjects.some(subject => 
        clientCert.subject.CN?.includes(subject)
      );
      
      if (!isAuthorized) {
        logger.warn(`❌ mTLS: Invalid certificate CN: ${clientCert.subject.CN} from ${req.ip}`);
        return res.status(403).json({ 
          error: 'Invalid client certificate',
          message: 'Certificate not authorized for this service'
        });
      }
      
      // Add certificate info to request for audit logging
      req.clientCert = {
        cn: clientCert.subject.CN,
        issuer: clientCert.issuer.CN,
        fingerprint: clientCert.fingerprint,
        valid_from: clientCert.valid_from,
        valid_to: clientCert.valid_to
      };
      
      logger.debug(`✅ mTLS: Authenticated client: ${clientCert.subject.CN}`);
      next();
    });
  }

  // Global exception filter for security
  app.useGlobalFilters();

  // Health check endpoint
  app.use('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'stellar-custody-mvp-backend',
      version: '1.0.0',
      environment: nodeEnv,
      mtlsEnabled
    });
  });

  // Start the server
  const server = mtlsEnabled 
    ? await app.listen(port, '0.0.0.0')
    : await app.listen(port);

  logger.log(`🚀 Stellar Custody MVP Backend started successfully!`);
  logger.log(`🌐 Server running on: ${mtlsEnabled ? 'https' : 'http'}://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api`);
  logger.log(`❤️  Health Check: http://localhost:${port}/health`);
  
  if (nodeEnv === 'development') {
    logger.log(`🔧 Environment: Development mode`);
    logger.log(`🗄️  Database: ${configService.get('DATABASE_URL')}:${configService.get('DATABASE_PORT')}`);
    logger.log(`🔐 HSM: ${configService.get('HSM_HOST')}:${configService.get('HSM_PORT')}`);
    logger.log(`📱 WhatsApp API: ${configService.get('WHATSAPP_API_URL')}`);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('🔄 SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    logger.log('🔄 SIGINT received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  return server;
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
