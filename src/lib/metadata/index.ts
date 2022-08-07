export type MetadataMap = { [key: string]: MetadataValue };
export type MetadataValue = { [key: string]: MetadataValue } | string;

export { Field, defineField, fieldTypes } from './fields';
export { String, Int, UInt, Fix64, UFix64, Bool, IPFSImage } from './fields';
export { Schema, createSchema, parseSchema, defaultSchema } from './schema';
export { hashMetadata } from './hash';

export { DisplayView } from './views';
