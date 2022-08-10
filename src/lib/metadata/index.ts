export type MetadataMap = { [key: string]: MetadataValue };
export type MetadataValue = { [key: string]: MetadataValue } | string;

export { Field, Fields, fieldTypes } from './fields';
export { String, Int, UInt, Fix64, UFix64, Bool, HTTPFile, IPFSFile } from './fields';
export { Schema, createSchema, parseSchema, defaultSchema } from './schema';
export { hashMetadata, hashMetadataWithSalt } from './hash';

export { View, DisplayView, MediaView } from './views';
