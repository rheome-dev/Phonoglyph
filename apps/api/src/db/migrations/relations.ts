import { relations } from "drizzle-orm/relations";
import { projects, editStates, users, fileMetadata, projectShares, userProfiles, auditLogs, midiFiles, visualizationSettings, projectCollaborators, eventBasedMappings, assetUsage, projectStorageQuotas, assetFolders, assetTags, assetTagRelationships, audioEventCache, stemSeparationJobs, stemSeparations, exportJobs, audioAnalysisCache, audioAnalysisJobs } from "./schema";

export const editStatesRelations = relations(editStates, ({one}) => ({
	project: one(projects, {
		fields: [editStates.projectId],
		references: [projects.id]
	}),
	users: one(users, {
		fields: [editStates.userId],
		references: [users.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	editStates: many(editStates),
	fileMetadatum: one(fileMetadata, {
		fields: [projects.primaryMidiFileId],
		references: [fileMetadata.id],
		relationName: "projects_primaryMidiFileId_fileMetadata_id"
	}),
	users: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	projectShares: many(projectShares),
	projectCollaborators: many(projectCollaborators),
	eventBasedMappings: many(eventBasedMappings),
	assetUsages: many(assetUsage),
	projectStorageQuotas: many(projectStorageQuotas),
	assetFolders: many(assetFolders),
	assetTags: many(assetTags),
	fileMetadata: many(fileMetadata, {
		relationName: "fileMetadata_projectId_projects_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	editStates: many(editStates),
	projects: many(projects),
	userProfiles: many(userProfiles),
	auditLogs: many(auditLogs),
	visualizationSettings: many(visualizationSettings),
	midiFiles: many(midiFiles),
	projectCollaborators: many(projectCollaborators),
	eventBasedMappings: many(eventBasedMappings),
	audioEventCaches: many(audioEventCache),
	stemSeparationJobs: many(stemSeparationJobs),
	fileMetadata: many(fileMetadata),
	stemSeparations: many(stemSeparations),
	exportJobs: many(exportJobs),
	audioAnalysisCaches: many(audioAnalysisCache),
	audioAnalysisJobs: many(audioAnalysisJobs),
}));

export const fileMetadataRelations = relations(fileMetadata, ({one, many}) => ({
	projects: many(projects, {
		relationName: "projects_primaryMidiFileId_fileMetadata_id"
	}),
	assetUsages: many(assetUsage),
	assetTagRelationships: many(assetTagRelationships),
	audioEventCaches: many(audioEventCache),
	assetFolder: one(assetFolders, {
		fields: [fileMetadata.folderId],
		references: [assetFolders.id]
	}),
	project: one(projects, {
		fields: [fileMetadata.projectId],
		references: [projects.id],
		relationName: "fileMetadata_projectId_projects_id"
	}),
	users: one(users, {
		fields: [fileMetadata.userId],
		references: [users.id]
	}),
	stemSeparations: many(stemSeparations),
	audioAnalysisCaches: many(audioAnalysisCache),
	audioAnalysisJobs: many(audioAnalysisJobs),
}));

export const projectSharesRelations = relations(projectShares, ({one}) => ({
	project: one(projects, {
		fields: [projectShares.projectId],
		references: [projects.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	users: one(users, {
		fields: [userProfiles.id],
		references: [users.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	users: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const visualizationSettingsRelations = relations(visualizationSettings, ({one}) => ({
	midiFile: one(midiFiles, {
		fields: [visualizationSettings.midiFileId],
		references: [midiFiles.id]
	}),
	users: one(users, {
		fields: [visualizationSettings.userId],
		references: [users.id]
	}),
}));

export const midiFilesRelations = relations(midiFiles, ({one, many}) => ({
	visualizationSettings: many(visualizationSettings),
	users: one(users, {
		fields: [midiFiles.userId],
		references: [users.id]
	}),
}));

export const projectCollaboratorsRelations = relations(projectCollaborators, ({one}) => ({
	project: one(projects, {
		fields: [projectCollaborators.projectId],
		references: [projects.id]
	}),
	users: one(users, {
		fields: [projectCollaborators.userId],
		references: [users.id]
	}),
}));

export const eventBasedMappingsRelations = relations(eventBasedMappings, ({one}) => ({
	project: one(projects, {
		fields: [eventBasedMappings.projectId],
		references: [projects.id]
	}),
	users: one(users, {
		fields: [eventBasedMappings.userId],
		references: [users.id]
	}),
}));

export const assetUsageRelations = relations(assetUsage, ({one}) => ({
	fileMetadatum: one(fileMetadata, {
		fields: [assetUsage.fileId],
		references: [fileMetadata.id]
	}),
	project: one(projects, {
		fields: [assetUsage.projectId],
		references: [projects.id]
	}),
}));

export const projectStorageQuotasRelations = relations(projectStorageQuotas, ({one}) => ({
	project: one(projects, {
		fields: [projectStorageQuotas.projectId],
		references: [projects.id]
	}),
}));

export const assetFoldersRelations = relations(assetFolders, ({one, many}) => ({
	assetFolder: one(assetFolders, {
		fields: [assetFolders.parentFolderId],
		references: [assetFolders.id],
		relationName: "assetFolders_parentFolderId_assetFolders_id"
	}),
	assetFolders: many(assetFolders, {
		relationName: "assetFolders_parentFolderId_assetFolders_id"
	}),
	project: one(projects, {
		fields: [assetFolders.projectId],
		references: [projects.id]
	}),
	fileMetadata: many(fileMetadata),
}));

export const assetTagsRelations = relations(assetTags, ({one, many}) => ({
	project: one(projects, {
		fields: [assetTags.projectId],
		references: [projects.id]
	}),
	assetTagRelationships: many(assetTagRelationships),
}));

export const assetTagRelationshipsRelations = relations(assetTagRelationships, ({one}) => ({
	fileMetadatum: one(fileMetadata, {
		fields: [assetTagRelationships.fileId],
		references: [fileMetadata.id]
	}),
	assetTag: one(assetTags, {
		fields: [assetTagRelationships.tagId],
		references: [assetTags.id]
	}),
}));

export const audioEventCacheRelations = relations(audioEventCache, ({one}) => ({
	fileMetadatum: one(fileMetadata, {
		fields: [audioEventCache.fileMetadataId],
		references: [fileMetadata.id]
	}),
	users: one(users, {
		fields: [audioEventCache.userId],
		references: [users.id]
	}),
}));

export const stemSeparationJobsRelations = relations(stemSeparationJobs, ({one}) => ({
	users: one(users, {
		fields: [stemSeparationJobs.userId],
		references: [users.id]
	}),
}));

export const stemSeparationsRelations = relations(stemSeparations, ({one}) => ({
	fileMetadatum: one(fileMetadata, {
		fields: [stemSeparations.fileMetadataId],
		references: [fileMetadata.id]
	}),
	users: one(users, {
		fields: [stemSeparations.userId],
		references: [users.id]
	}),
}));

export const exportJobsRelations = relations(exportJobs, ({one}) => ({
	users: one(users, {
		fields: [exportJobs.userId],
		references: [users.id]
	}),
}));

export const audioAnalysisCacheRelations = relations(audioAnalysisCache, ({one}) => ({
	fileMetadatum: one(fileMetadata, {
		fields: [audioAnalysisCache.fileMetadataId],
		references: [fileMetadata.id]
	}),
	users: one(users, {
		fields: [audioAnalysisCache.userId],
		references: [users.id]
	}),
}));

export const audioAnalysisJobsRelations = relations(audioAnalysisJobs, ({one}) => ({
	fileMetadatum: one(fileMetadata, {
		fields: [audioAnalysisJobs.fileMetadataId],
		references: [fileMetadata.id]
	}),
	users: one(users, {
		fields: [audioAnalysisJobs.userId],
		references: [users.id]
	}),
}));