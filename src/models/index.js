const UserModel = require('./userModel');
const RoleModel = require('./roleModel');
const UserRoleModel = require('./userRoleModel');
const ProjectModel = require('./projectModel');
const ProjectResponsibleModel = require('./projectResponsibleModel');
const TaskModel = require('./taskModel');
const FileModel = require('./fileModel');
const LogActivityModel = require('./logActivityModel');

async function createAllTables() {
  // Create tables in dependency order
  await UserModel.createTable();
  await RoleModel.createTable();
  await UserRoleModel.createTable();
  await ProjectModel.createTable();
  await ProjectResponsibleModel.createTable();
  await TaskModel.createTable();
  await FileModel.createTable();
  await LogActivityModel.createTable();

  // Seed roles
  await RoleModel.seedDefaults();
}

module.exports = {
  UserModel,
  RoleModel,
  UserRoleModel,
  ProjectModel,
  ProjectResponsibleModel,
  TaskModel,
  FileModel,
  LogActivityModel,
  createAllTables,
};
