export type MetadataMap = { [key: string]: MetadataValue };
export type MetadataValue = { [key: string]: MetadataValue } | string;

export { Field, FieldMap, fieldTypes } from './fields';
export { String, Int, UInt, Fix64, UFix64, Bool, IPFSImage, HTTPFile, IPFSFile } from './fields';
export { Schema, SchemaInput, createSchema, parseSchema, defaultSchema } from './schema';
export { hashMetadata, hashMetadataWithSalt } from './hash';

export { View, DisplayView, MediaView } from './views';
