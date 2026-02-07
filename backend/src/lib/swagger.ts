import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskMan API',
      version: '1.0.0',
      description: 'Unified Task Management System API documentation',
    },
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: 'Development server',
      },
      {
        url: 'https://your-deployment-url.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the user',
            },
            email: {
              type: 'string',
              description: 'User email address',
            },
            name: {
              type: 'string',
              description: 'User name',
            },
            avatarUrl: {
              type: 'string',
              description: 'URL to user avatar image',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when user was created',
            },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the task',
            },
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Task description',
            },
            projectId: {
              type: 'string',
              description: 'ID of the project this task belongs to',
            },
            assigneeId: {
              type: 'string',
              description: 'ID of the user assigned to this task',
            },
            status: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
              description: 'Current status of the task',
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
              description: 'Priority level of the task',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Due date for the task',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when task was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when task was last updated',
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the project',
            },
            name: {
              type: 'string',
              description: 'Project name',
            },
            description: {
              type: 'string',
              description: 'Project description',
            },
            color: {
              type: 'string',
              description: 'Color associated with the project',
            },
            ownerId: {
              type: 'string',
              description: 'ID of the user who owns the project',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when project was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when project was last updated',
            },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the API key',
            },
            name: {
              type: 'string',
              description: 'Name of the API key',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when API key was created',
            },
            lastUsedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when API key was last used',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

export default specs;