import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api/client.js';
import { config } from '../config/store.js';
import { promptForText } from '../utils/prompts.js';

export const loginCommand = new Command('login')
    .description('Configure API credentials')
    .action(async () => {
        try {
            console.log(chalk.bold('\n🔐 TaskMan CLI Login\n'));

            // Prompt for base URL
            const baseUrl = await promptForText(
                'Enter TaskMan API URL:',
                config.baseUrl || 'http://localhost:3000'
            );

            // Prompt for API key
            const apiKey = await promptForText('Enter your API key:');

            if (!apiKey) {
                console.error(chalk.red('API key is required'));
                process.exit(1);
            }

            // Save temporarily to test
            const oldApiKey = config.apiKey;
            const oldBaseUrl = config.baseUrl;
            config.apiKey = apiKey;
            config.baseUrl = baseUrl;
            api.updateBaseUrl(baseUrl);

            // Test the credentials
            console.log(chalk.gray('\nTesting connection...'));
            try {
                const response = await api.get<{ user: any }>('/auth/me');

                console.log(chalk.green('✓ Authentication successful!'));
                console.log(chalk.gray(`Logged in as: ${response.user.name} (${response.user.email})`));
                console.log(chalk.gray(`Config saved to: ${config.getConfigPath()}\n`));
            } catch (error) {
                // Restore old values on failure
                if (oldApiKey) config.apiKey = oldApiKey;
                if (oldBaseUrl) config.baseUrl = oldBaseUrl;

                console.error(chalk.red('\n✗ Authentication failed. Please check your API key and URL.'));
                process.exit(1);
            }
        } catch (error: any) {
            console.error(chalk.red('Error:'), error.message);
            process.exit(1);
        }
    });
