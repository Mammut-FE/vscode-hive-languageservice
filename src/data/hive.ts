import { builtInFunctions, keywords } from '@mammut-fe/hive-data';

export const data: any = {
    use: [
        {
            name: 'use',
            desc: 'USE sets the current database for all subsequent HiveQL statements.',
            restriction: 'string',
            values: [
                {
                    name: 'DEFAULT',
                    desc: 'HiveQL default database.'
                }
            ]
        }
    ],
    select: [
        {
            name: 'select'
        }
    ],
    builtInFunctions,
    keywords
};

export const descriptions: any = {};
