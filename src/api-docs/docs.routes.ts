import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from '@/api-docs/openapi.js';

const openApiDocument = generateOpenApiDocument();

export const docsRouter = Router();

docsRouter.use('/', swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(openApiDocument));

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
