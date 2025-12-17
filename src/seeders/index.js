require('dotenv').config();
const { testConnection } = require('../config/database');
const db = require('../models');
const { USER_ROLES, PERMISSIONS } = require('../config/constants');
const bcrypt = require('bcryptjs');

const seedRoles = async () => {
  console.log('Seeding roles...');
  
  const roles = [
    {
      role_name: USER_ROLES.SUPER_ADMIN,
      description: 'Full system access, can manage all prisons and users'
    },
    {
      role_name: USER_ROLES.PRISON_ADMIN,
      description: 'Can manage a specific prison and its users'
    },
    {
      role_name: USER_ROLES.OFFICER,
      description: 'Can manage prisoners and their records'
    },
    {
      role_name: USER_ROLES.RECORDS_KEEPER,
      description: 'Can manage work and behaviour records'
    },
    {
      role_name: USER_ROLES.VISITOR_MANAGER,
      description: 'Can manage visitors and schedule visits'
    }
  ];

  for (const role of roles) {
    await db.Role.findOrCreate({
      where: { role_name: role.role_name },
      defaults: role
    });
  }

  console.log('✅ Roles seeded successfully');
};

const seedPermissions = async () => {
  console.log('Seeding permissions...');

  const permissionsList = Object.values(PERMISSIONS).map(permission => ({
    permission_name: permission,
    description: permission.replace(/_/g, ' ').toUpperCase()
  }));

  for (const permission of permissionsList) {
    await db.Permission.findOrCreate({
      where: { permission_name: permission.permission_name },
      defaults: permission
    });
  }

  console.log('✅ Permissions seeded successfully');
};

const seedRolePermissions = async () => {
  console.log('Seeding role permissions...');

  // Get all roles and permissions
  const superAdmin = await db.Role.findOne({ where: { role_name: USER_ROLES.SUPER_ADMIN } });
  const prisonAdmin = await db.Role.findOne({ where: { role_name: USER_ROLES.PRISON_ADMIN } });
  const officer = await db.Role.findOne({ where: { role_name: USER_ROLES.OFFICER } });
  const recordsKeeper = await db.Role.findOne({ where: { role_name: USER_ROLES.RECORDS_KEEPER } });
  const visitorManager = await db.Role.findOne({ where: { role_name: USER_ROLES.VISITOR_MANAGER } });

  const allPermissions = await db.Permission.findAll();

  // Super Admin - All permissions
  await superAdmin.setPermissions(allPermissions);

  // Prison Admin - Most permissions except super admin functions
  const prisonAdminPerms = allPermissions.filter(p => 
    p.permission_name !== PERMISSIONS.MANAGE_PRISONS
  );
  await prisonAdmin.setPermissions(prisonAdminPerms);

  // Officer - Prisoner management
  const officerPerms = allPermissions.filter(p => 
    p.permission_name.includes('prisoner') || 
    p.permission_name.includes('behaviour') ||
    p.permission_name === PERMISSIONS.VIEW_USERS ||
    p.permission_name === PERMISSIONS.VIEW_REPORTS
  );
  await officer.setPermissions(officerPerms);

  // Records Keeper - Work and behaviour records
  const recordsKeeperPerms = allPermissions.filter(p =>
    p.permission_name.includes('work') ||
    p.permission_name.includes('behaviour') ||
    p.permission_name === PERMISSIONS.VIEW_PRISONERS ||
    p.permission_name === PERMISSIONS.VIEW_REPORTS
  );
  await recordsKeeper.setPermissions(recordsKeeperPerms);

  // Visitor Manager - Visitor management
  const visitorManagerPerms = allPermissions.filter(p =>
    p.permission_name.includes('visitor') ||
    p.permission_name.includes('visit') ||
    p.permission_name === PERMISSIONS.VIEW_PRISONERS ||
    p.permission_name === PERMISSIONS.VIEW_REPORTS
  );
  await visitorManager.setPermissions(visitorManagerPerms);

  console.log('✅ Role permissions seeded successfully');
};

const seedPrisons = async () => {
  console.log('Seeding prisons...');

  const prisons = [
    {
      prison_name: 'Colombo Remand Prison',
      location: 'Colombo',
      address: 'Welikada Rd, Colombo 08',
      capacity: 1500,
      superintendent_name: 'Mr. Sunil Jayasinghe',
      contact_number: '0112-345678',
      email: 'colombo-remand@prison.lk',
      established_date: '1950-01-01',
      is_active: true
    },
    {
      prison_name: 'Welikada Prison',
      location: 'Colombo',
      address: 'Welikada, Sri Jayawardenepura Kotte',
      capacity: 2500,
      superintendent_name: 'Mr. Dilan Perera',
      contact_number: '0112-556677',
      email: 'welikada@prison.lk',
      established_date: '1880-01-01',
      is_active: true
    },
    {
      prison_name: 'Galle Prison',
      location: 'Galle',
      address: 'Galle Fort',
      capacity: 800,
      superintendent_name: 'Mr. Rohana Silva',
      contact_number: '0912-224466',
      email: 'galle@prison.lk',
      established_date: '1920-01-01',
      is_active: true
    }
  ];

  for (const prison of prisons) {
    await db.Prison.findOrCreate({
      where: { prison_name: prison.prison_name },
      defaults: prison
    });
  }

  console.log('✅ Prisons seeded successfully');
};


const seedSuperAdmin = async () => {
  console.log('Seeding super admin user...');

  const superAdminRole = await db.Role.findOne({ 
    where: { role_name: USER_ROLES.SUPER_ADMIN } 
  });

  const existingSuperAdmin = await db.User.findOne({
    where: { username: 'superadmin' }
  });

  if (!existingSuperAdmin) {
    await db.User.create({
      employee_full_name: 'Super Administrator',
      nic: '199912345678',
      gender: 'Male',
      birthday: '1999-01-01',
      email: 'superadmin@prison.lk',
      address: 'System Administrator',
      username: 'superadmin',
      password_hash: 'Admin@123', // Will be hashed by the model hook
      role_id: superAdminRole.role_id,
      prison_id: null,
      is_active: true
    });

    console.log('✅ Super admin created successfully');
    console.log('   Username: superadmin');
    console.log('   Password: Admin@123');
    console.log('   ⚠️  Please change this password after first login!');
  } else {
    console.log('ℹ️  Super admin already exists');
  }
};

const runSeeders = async () => {
  try {
    await testConnection();
    
    // Sync database
    await db.sync({ alter: false });

    // Run seeders in order
    await seedRoles();
    await seedPermissions();
    await seedRolePermissions();
    await seedPrisons();
    await seedSuperAdmin();

    console.log('\n🎉 All seeders completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeders:', error);
    process.exit(1);
  }
};

runSeeders();