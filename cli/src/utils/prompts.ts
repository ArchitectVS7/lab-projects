import inquirer from 'inquirer';

export async function confirmAction(message: string): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message,
            default: false,
        },
    ]);
    return confirmed;
}

export async function promptForText(message: string, defaultValue?: string): Promise<string> {
    const { value } = await inquirer.prompt([
        {
            type: 'input',
            name: 'value',
            message,
            default: defaultValue,
        },
    ]);
    return value;
}

export async function selectFromList<T>(
    message: string,
    choices: Array<{ name: string; value: T }>,
    defaultValue?: T
): Promise<T> {
    const { selected } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selected',
            message,
            choices,
            default: defaultValue,
        },
    ]);
    return selected;
}

export async function selectMultiple<T>(
    message: string,
    choices: Array<{ name: string; value: T; checked?: boolean }>
): Promise<T[]> {
    const { selected } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selected',
            message,
            choices,
        },
    ]);
    return selected;
}
