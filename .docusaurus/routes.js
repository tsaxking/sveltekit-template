import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/sveltekit-template/__docusaurus/debug',
    component: ComponentCreator('/sveltekit-template/__docusaurus/debug', '5ee'),
    exact: true
  },
  {
    path: '/sveltekit-template/__docusaurus/debug/config',
    component: ComponentCreator('/sveltekit-template/__docusaurus/debug/config', '266'),
    exact: true
  },
  {
    path: '/sveltekit-template/__docusaurus/debug/content',
    component: ComponentCreator('/sveltekit-template/__docusaurus/debug/content', 'e22'),
    exact: true
  },
  {
    path: '/sveltekit-template/__docusaurus/debug/globalData',
    component: ComponentCreator('/sveltekit-template/__docusaurus/debug/globalData', '13f'),
    exact: true
  },
  {
    path: '/sveltekit-template/__docusaurus/debug/metadata',
    component: ComponentCreator('/sveltekit-template/__docusaurus/debug/metadata', '8fb'),
    exact: true
  },
  {
    path: '/sveltekit-template/__docusaurus/debug/registry',
    component: ComponentCreator('/sveltekit-template/__docusaurus/debug/registry', '557'),
    exact: true
  },
  {
    path: '/sveltekit-template/__docusaurus/debug/routes',
    component: ComponentCreator('/sveltekit-template/__docusaurus/debug/routes', 'e30'),
    exact: true
  },
  {
    path: '/sveltekit-template/search',
    component: ComponentCreator('/sveltekit-template/search', '9fd'),
    exact: true
  },
  {
    path: '/sveltekit-template/',
    component: ComponentCreator('/sveltekit-template/', '5c6'),
    routes: [
      {
        path: '/sveltekit-template/',
        component: ComponentCreator('/sveltekit-template/', 'ba9'),
        routes: [
          {
            path: '/sveltekit-template/',
            component: ComponentCreator('/sveltekit-template/', '273'),
            routes: [
              {
                path: '/sveltekit-template/api/',
                component: ComponentCreator('/sveltekit-template/api/', 'e3c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/hooks.server/',
                component: ComponentCreator('/sveltekit-template/api/hooks.server/', '668'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/hooks.server/variables/handle',
                component: ComponentCreator('/sveltekit-template/api/hooks.server/variables/handle', '709'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/',
                component: ComponentCreator('/sveltekit-template/api/lib/', '4fa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/canvas/bubbles/',
                component: ComponentCreator('/sveltekit-template/api/lib/canvas/bubbles/', 'd2a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/canvas/bubbles/functions/render',
                component: ComponentCreator('/sveltekit-template/api/lib/canvas/bubbles/functions/render', 'ffe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/canvas/critters/',
                component: ComponentCreator('/sveltekit-template/api/lib/canvas/critters/', 'e06'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/canvas/critters/functions/render',
                component: ComponentCreator('/sveltekit-template/api/lib/canvas/critters/functions/render', 'dc6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/imports/',
                component: ComponentCreator('/sveltekit-template/api/lib/imports/', 'f7d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/imports/admin/',
                component: ComponentCreator('/sveltekit-template/api/lib/imports/admin/', 'cb9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/imports/admin/variables/default',
                component: ComponentCreator('/sveltekit-template/api/lib/imports/admin/variables/default', '0e1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/', 'e87'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/', '3d9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/functions/getNotifs',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/functions/getNotifs', 'ee5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/functions/getSelf',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/functions/getSelf', '3c4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/functions/search',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/functions/search', '457'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/functions/searchAccountsModal',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/functions/searchAccountsModal', '75e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/functions/signOut',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/functions/signOut', '5cf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/functions/signOutOfSession',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/functions/signOutOfSession', '1fb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/functions/usernameExists',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/functions/usernameExists', '92b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountArr', 'eb2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountData', '394'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountInfoData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountInfoData', '7dd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountNotificationArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountNotificationArr', '01d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountNotificationData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/type-aliases/AccountNotificationData', '0ee'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/variables/Account',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/variables/Account', '3dc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/variables/AccountInfo',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/variables/AccountInfo', '396'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/variables/AccountNotification',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/variables/AccountNotification', '369'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/account/namespaces/Account/variables/self',
                component: ComponentCreator('/sveltekit-template/api/lib/model/account/namespaces/Account/variables/self', '9e7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/analytics/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/analytics/', 'f04'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/', '231'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/functions/count',
                component: ComponentCreator('/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/functions/count', '293'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/functions/myLinks',
                component: ComponentCreator('/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/functions/myLinks', 'dfe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/type-aliases/LinkData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/type-aliases/LinkData', 'db9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/variables/Links',
                component: ComponentCreator('/sveltekit-template/api/lib/model/analytics/namespaces/Analytics/variables/Links', 'dfe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/dashboard/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/dashboard/', 'fa2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/', '203'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/classes/Card',
                component: ComponentCreator('/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/classes/Card', '557'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/classes/Dashboard',
                component: ComponentCreator('/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/classes/Dashboard', '64b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/functions/getGridSize',
                component: ComponentCreator('/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/functions/getGridSize', 'e46'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/variables/sizes',
                component: ComponentCreator('/sveltekit-template/api/lib/model/dashboard/namespaces/Dashboard/variables/sizes', '0b5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/navbar/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/navbar/', '0e2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/', '6f2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/addSection',
                component: ComponentCreator('/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/addSection', '493'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/clear',
                component: ComponentCreator('/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/clear', '63e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/getSections',
                component: ComponentCreator('/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/getSections', '87f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/removeSection',
                component: ComponentCreator('/sveltekit-template/api/lib/model/navbar/namespaces/Navbar/functions/removeSection', '25e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/', '32a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/', 'c84'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/addToRole',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/addToRole', '4bb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/createChildRolePopup',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/createChildRolePopup', '970'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/createRole',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/createRole', 'b51'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getAvailableRolePermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getAvailableRolePermissions', '84f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getEntitlementGroups',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getEntitlementGroups', 'af3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getEntitlements',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getEntitlements', '955'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getRolePermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/getRolePermissions', 'abc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/grantAccountPermission',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/grantAccountPermission', '999'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/grantRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/grantRuleset', 'e07'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/removeFromRole',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/removeFromRole', '9ba'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/revokeAccountPermission',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/revokeAccountPermission', '00b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/revokeRolePermission',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/revokeRolePermission', 'e32'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/searchRoles',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/functions/searchRoles', '51a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/AccountRulesetData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/AccountRulesetData', '95f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/AccountRulesetDataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/AccountRulesetDataArr', '151'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/EntitlementData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/EntitlementData', '657'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/EntitlementDataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/EntitlementDataArr', 'c72'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleAccountData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleAccountData', 'c69'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleAccountDataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleAccountDataArr', '090'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleData', 'e50'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleDataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleDataArr', 'd47'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleRulesetData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleRulesetData', '3a1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleRulesetDataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/type-aliases/RoleRulesetDataArr', 'd3f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/AccountRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/AccountRuleset', 'fde'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/Entitlement',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/Entitlement', '0d6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/Role',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/Role', 'aca'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/RoleAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/RoleAccount', 'da9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/RoleRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/model/permissions/namespaces/Permissions/variables/RoleRuleset', 'ef4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/', '642'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/', '4a9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/functions/unitTest',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/functions/unitTest', 'bbc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/State',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/State', '206'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/Status',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/Status', '1aa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/TestData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/TestData', '92f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/TestPermissionsArr',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/TestPermissionsArr', '73c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/TestPermissionsData',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/type-aliases/TestPermissionsData', 'a24'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/variables/Test',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/variables/Test', '5bb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/variables/TestPermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/model/testing.svelte/namespaces/Test/variables/TestPermissions', '773'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/account.remote/',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/account.remote/', 'd3e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/account.remote/variables/getNotifications',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/account.remote/variables/getNotifications', 'c2e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/account.remote/variables/getOwnNotifs',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/account.remote/variables/getOwnNotifs', '8fd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/account.remote/variables/search',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/account.remote/variables/search', '1c1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/account.remote/variables/self',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/account.remote/variables/self', '078'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/account.remote/variables/signOut',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/account.remote/variables/signOut', 'faf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/account.remote/variables/usernameExists',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/account.remote/variables/usernameExists', '03e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/analytics.remote/',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/analytics.remote/', 'a65'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/analytics.remote/variables/close',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/analytics.remote/variables/close', '57e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/analytics.remote/variables/count',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/analytics.remote/variables/count', '7c4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/analytics.remote/variables/fingerprint',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/analytics.remote/variables/fingerprint', '733'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/analytics.remote/variables/myLinks',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/analytics.remote/variables/myLinks', '10f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/index.remote/',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/index.remote/', '4ba'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/index.remote/variables/getAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/index.remote/variables/getAccount', '697'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/index.remote/variables/getSession',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/index.remote/variables/getSession', '474'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/index.remote/variables/getSSE',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/index.remote/variables/getSSE', '243'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/index.remote/variables/isAdmin',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/index.remote/variables/isAdmin', '018'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/index.remote/variables/isLoggedIn',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/index.remote/variables/isLoggedIn', '0c0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/ntp.remote/',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/ntp.remote/', '731'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/ntp.remote/variables/ntp',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/ntp.remote/variables/ntp', '820'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/', 'bfa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/addToRole',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/addToRole', 'd44'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/availablePermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/availablePermissions', '9f1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/createRole',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/createRole', '9f8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/grantAccountPermission',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/grantAccountPermission', '209'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/grantRolePermission',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/grantRolePermission', '466'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/myAccountPermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/myAccountPermissions', 'fc4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/myPermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/myPermissions', '9ca'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/permissionsFromRole',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/permissionsFromRole', '59e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/removeFromRole',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/removeFromRole', 'b50'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/revokeAccountPermission',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/revokeAccountPermission', 'd6f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/revokeRolePermission',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/revokeRolePermission', '10f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/permissions.remote/variables/searchRoles',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/permissions.remote/variables/searchRoles', '980'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/', '070'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/closeManager',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/closeManager', 'af1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/getActiveConnections',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/getActiveConnections', '947'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/getManagerConnections',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/getManagerConnections', '3a7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/isOwner',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/isOwner', 'ca4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/managerSend',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/managerSend', '015'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/redirectConnection',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/redirectConnection', '2dc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/reloadConnection',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/reloadConnection', '85c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/reportState',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/reportState', 'b65'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/sendToConnection',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/sendToConnection', 'aa6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/session-manager.remote/variables/startManager',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/session-manager.remote/variables/startManager', '0dc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/', 'bea'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/all',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/all', '2f5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/archive',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/archive', '417'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/archived',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/archived', '529'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/batchCommand',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/batchCommand', '3b0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/batchQuery',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/batchQuery', 'c17'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/clear',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/clear', '99d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/connect',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/connect', '554'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/create',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/create', '4ed'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/fromId',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/fromId', '983'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/fromIds',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/fromIds', '499'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/get',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/get', '962'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/remove',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/remove', '0f1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/removeVersion',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/removeVersion', 'e2f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/restoreArchive',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/restoreArchive', '591'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/restoreVersion',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/restoreVersion', '8b9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/update',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/update', 'f48'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/remotes/struct.remote/variables/versionHistory',
                component: ComponentCreator('/sveltekit-template/api/lib/remotes/struct.remote/variables/versionHistory', 'c9e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/', '8be'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/db/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/db/', '560'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/db/variables/client',
                component: ComponentCreator('/sveltekit-template/api/lib/server/db/variables/client', '291'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/db/variables/DB',
                component: ComponentCreator('/sveltekit-template/api/lib/server/db/variables/DB', '1bc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/event-handler/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/event-handler/', '700'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/event-handler/enumerations/EventErrorCode',
                component: ComponentCreator('/sveltekit-template/api/lib/server/event-handler/enumerations/EventErrorCode', '141'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/event-handler/enumerations/EventSuccessCode',
                component: ComponentCreator('/sveltekit-template/api/lib/server/event-handler/enumerations/EventSuccessCode', 'd90'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/event-handler/functions/status',
                component: ComponentCreator('/sveltekit-template/api/lib/server/event-handler/functions/status', '080'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/event-handler/variables/Errors',
                component: ComponentCreator('/sveltekit-template/api/lib/server/event-handler/variables/Errors', '9fb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/event-handler/variables/Success',
                component: ComponentCreator('/sveltekit-template/api/lib/server/event-handler/variables/Success', 'bb1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/functions/postBuild',
                component: ComponentCreator('/sveltekit-template/api/lib/server/functions/postBuild', 'eba'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/email/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/email/', '8ef'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/email/functions/sendEmail',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/email/functions/sendEmail', '601'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/file-upload/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/file-upload/', 'e77'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/file-upload/classes/FileUploader',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/file-upload/classes/FileUploader', '260'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/global-events/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/global-events/', '2e7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/global-events/type-aliases/Events',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/global-events/type-aliases/Events', '63e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/global-events/variables/default',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/global-events/variables/default', 'a20'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/ntp/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/ntp/', '107'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/', 'bb1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/functions/getLastSynced',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/functions/getLastSynced', 'c1f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/functions/getTime',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/functions/getTime', '60f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/functions/init',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/ntp/namespaces/TimeService/functions/init', 'fcf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/redis/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/redis/', '11f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/redis/variables/default',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/redis/variables/default', 'b78'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/session-manager/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/session-manager/', '043'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/session-manager/classes/SessionManager',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/session-manager/classes/SessionManager', '8b0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/sse/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/sse/', '804'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/sse/classes/Connection',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/sse/classes/Connection', 'ef5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/sse/classes/SSE',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/sse/classes/SSE', 'ac9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/sse/variables/sse',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/sse/variables/sse', 'aca'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/struct-event/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/struct-event/', 'c7d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/struct-event/functions/createStructEventService',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/struct-event/functions/createStructEventService', '8f4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/struct-event/functions/createStructListenerService',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/struct-event/functions/createStructListenerService', '7fb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/struct-registry/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/struct-registry/', '118'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/struct-registry/variables/default',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/struct-registry/variables/default', '823'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/uuid/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/uuid/', '53b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/services/uuid/functions/uuid',
                component: ComponentCreator('/sveltekit-template/api/lib/server/services/uuid/functions/uuid', '113'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/', 'e79'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/', '4f1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/createAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/createAccount', 'be8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/createAccountFromOauth',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/createAccountFromOauth', 'f71'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getAccountInfo',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getAccountInfo', '6fb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getAdmins',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getAdmins', '39b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getDevelopers',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getDevelopers', 'd48'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getSettings',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/getSettings', '2c3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/hash',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/hash', '349'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/isAdmin',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/isAdmin', 'b2c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/isDeveloper',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/isDeveloper', '2c8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/isOnline',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/isOnline', 'c2b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/newHash',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/newHash', 'e25'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/notifyPopup',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/notifyPopup', '2c6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/requestPasswordReset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/requestPasswordReset', 'b3d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/searchAccounts',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/searchAccounts', '77c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/sendAccountNotif',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/functions/sendAccountNotif', '0ea'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/type-aliases/AccountData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/type-aliases/AccountData', '109'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/type-aliases/AccountInfoData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/type-aliases/AccountInfoData', '873'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Account',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Account', '11b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/AccountInfo',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/AccountInfo', '7f8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/AccountNotification',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/AccountNotification', '457'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Admins',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Admins', '43a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Developers',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Developers', '2b3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/PasswordReset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/PasswordReset', '3b2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Settings',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/namespaces/Account/variables/Settings', '516'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/accountInfo',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/accountInfo', '2a0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/accountInfoVersionHistory',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/accountInfoVersionHistory', 'cb9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/accountNotificationTable',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/accountNotificationTable', 'a01'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/accountSettings',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/accountSettings', 'cda'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/accountTable',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/accountTable', '67c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/adminsTable',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/adminsTable', 'e28'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/developersTable',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/developersTable', 'd6f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/account/variables/passwordReset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/account/variables/passwordReset', '333'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/analytics/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/analytics/', 'a2b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/', '299'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/functions/getAccountLinks',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/functions/getAccountLinks', 'e35'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/functions/getCount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/functions/getCount', '221'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/type-aliases/LinkData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/type-aliases/LinkData', '9ea'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/variables/Links',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/analytics/namespaces/Analytics/variables/Links', 'b37'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/analytics/variables/links',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/analytics/variables/links', '801'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/', 'f9e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/', '222'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/getFingerprint',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/getFingerprint', '53b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isBlocked',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isBlocked', '17e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isBlockedPage',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isBlockedPage', 'e6b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isIpAllowed',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isIpAllowed', 'c6e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isIpLimitedPage',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/isIpLimitedPage', 'ed6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/rateLimit',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/rateLimit', 'faf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/violate',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/violate', 'e83'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/violationSeverity',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/functions/violationSeverity', '1a5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedAccounts',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedAccounts', '9c4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedFingerprints',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedFingerprints', '889'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedIps',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedIps', 'fd9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedSessions',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/BlockedSessions', '024'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/limits',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/limits', '450'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/PageRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/PageRuleset', '846'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/ViolationTiers',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/namespaces/Limiting/variables/ViolationTiers', 'e59'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/variables/blockedAccounts',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/variables/blockedAccounts', 'a67'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/variables/blockedFingerprints',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/variables/blockedFingerprints', '9e8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/variables/blockedIps',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/variables/blockedIps', '6c9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/variables/blockedSessions',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/variables/blockedSessions', '300'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/limiting/variables/pageRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/limiting/variables/pageRuleset', '490'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/log/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/log/', 'd8a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/', 'c99'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/functions/log',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/functions/log', '3c6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/functions/search',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/functions/search', 'bda'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/type-aliases/LogData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/type-aliases/LogData', '627'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/variables/Log',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/log/namespaces/Logs/variables/Log', 'aa5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/log/variables/logTable',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/log/variables/logTable', 'a8b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/', '25e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/', 'b37'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/classes/CombinedEntitlementPermission',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/classes/CombinedEntitlementPermission', '99c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/classes/EntitlementPermission',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/classes/EntitlementPermission', '54f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/accountCanDo',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/accountCanDo', 'a98'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/canCreate',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/canCreate', '7b4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/canDo',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/canDo', '148'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/canDoFeature',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/canDoFeature', '012'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/createChildRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/createChildRole', 'f63'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/createEntitlement',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/createEntitlement', '22c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/detectCircularHierarchy',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/detectCircularHierarchy', 'e32'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/filterPropertyActionFromAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/filterPropertyActionFromAccount', '9b3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/filterPropertyActionPipe',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/filterPropertyActionPipe', 'd7d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getAccountsFromRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getAccountsFromRole', 'bda'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getChildren',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getChildren', '2f3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getEntitlements',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getEntitlements', 'a60'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getEntitlementsFromAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getEntitlementsFromAccount', '5a7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getEntitlementsFromRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getEntitlementsFromRole', 'a4c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getHighestLevelRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getHighestLevelRole', 'b46'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getLowerHierarchy',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getLowerHierarchy', 'b87'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getParent',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getParent', '39b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getPermissionsFromEntitlement',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getPermissionsFromEntitlement', 'ea4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRoleRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRoleRuleset', 'b9b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRolesFromAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRolesFromAccount', 'dfb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRolesFromAccountWithinHierarchy',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRolesFromAccountWithinHierarchy', '5a6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRulesetsFromAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRulesetsFromAccount', '0bb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRulesetsFromRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRulesetsFromRole', '514'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRulesetsfromRoles',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getRulesetsfromRoles', 'f32'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getTopLevelRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getTopLevelRole', 'f95'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getUpperHierarchy',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/getUpperHierarchy', '681'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/grantRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/grantRole', '300'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/grantRoleRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/grantRoleRuleset', '055'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/isInRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/isInRole', '415'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/isParent',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/isParent', '4c9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/revokeRole',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/revokeRole', '866'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/revokeRoleRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/revokeRoleRuleset', '57f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/rolesCanDo',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/rolesCanDo', 'cc9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/searchRoles',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/searchRoles', 'a77'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/startHierarchy',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/functions/startHierarchy', '0a2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/AccountRulesetData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/AccountRulesetData', '715'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/EntitlementData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/EntitlementData', '714'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/Permission',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/Permission', '3f0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/RoleAccountData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/RoleAccountData', '95a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/RoleData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/RoleData', '0d0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/RoleRulesetData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/type-aliases/RoleRulesetData', '5e2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/AccountRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/AccountRuleset', 'c72'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/Entitlement',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/Entitlement', '62f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/Role',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/Role', '255'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/RoleAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/RoleAccount', '839'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/RoleRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/namespaces/Permissions/variables/RoleRuleset', 'ea0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/variables/accountRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/variables/accountRuleset', '1db'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/variables/entitlement',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/variables/entitlement', '76b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/variables/role',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/variables/role', '7fa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/variables/roleAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/variables/roleAccount', 'd8b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/permissions/variables/roleRuleset',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/permissions/variables/roleRuleset', 'fc8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/', '208'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/namespaces/Session/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/namespaces/Session/', '578'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/getAccount',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/getAccount', 'd9b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/getSession',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/getSession', '7fa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/signIn',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/signIn', '322'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/signOut',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/namespaces/Session/functions/signOut', '8bb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/namespaces/Session/type-aliases/SessionData',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/namespaces/Session/type-aliases/SessionData', 'bea'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/namespaces/Session/variables/Session',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/namespaces/Session/variables/Session', 'cee'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/session/variables/sessionTable',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/session/variables/sessionTable', '7b0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/testing/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/testing/', 'e36'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/testing/namespaces/Test/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/testing/namespaces/Test/', '476'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/testing/namespaces/Test/variables/Test',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/testing/namespaces/Test/variables/Test', '6ae'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/testing/namespaces/Test/variables/TestPermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/testing/namespaces/Test/variables/TestPermissions', 'e63'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/testing/variables/test',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/testing/variables/test', 'e64'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/testing/variables/testPermissions',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/testing/variables/testPermissions', '292'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/structs/testing/variables/testVersion',
                component: ComponentCreator('/sveltekit-template/api/lib/server/structs/testing/variables/testVersion', '35a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/config/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/config/', 'd23'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/config/variables/default',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/config/variables/default', '83a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/', '6b7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/classes/EnvironmentError',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/classes/EnvironmentError', 'f31'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/functions/bool',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/functions/bool', '901'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/functions/domain',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/functions/domain', 'e88'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/functions/get',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/functions/get', '50b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/functions/getPublicIp',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/functions/getPublicIp', 'af2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/functions/num',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/functions/num', 'f6c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/functions/str',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/functions/str', 'ee8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/variables/config',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/variables/config', '5fb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/env/variables/env',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/env/variables/env', '2da'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/file-match/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/file-match/', '9fa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/file-match/functions/pathMatch',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/file-match/functions/pathMatch', 'b60'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/', 'fe4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/classes/FileReceiver',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/classes/FileReceiver', 'bfc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/fileTree',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/fileTree', '1c4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/generateSearchFile',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/generateSearchFile', '126'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/openFile',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/openFile', '4b6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/openJSON',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/openJSON', '073'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/openJSONSync',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/openJSONSync', '3f5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/parseJSON',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/parseJSON', '714'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/renderSearchResultHtml',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/renderSearchResultHtml', 'ca7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/saveFile',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/saveFile', 'de1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/functions/searchFile',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/functions/searchFile', '32f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/files/type-aliases/FileTree',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/files/type-aliases/FileTree', '532'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/fingerprint/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/fingerprint/', '0dc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/fingerprint/functions/signFingerprint',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/fingerprint/functions/signFingerprint', '10f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/git/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/git/', 'cd8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/git/functions/branch',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/git/functions/branch', '1e8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/git/functions/commit',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/git/functions/commit', 'a00'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/git/functions/repoName',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/git/functions/repoName', 'e3d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/git/functions/repoSlug',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/git/functions/repoSlug', '8ae'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/git/functions/repoUrl',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/git/functions/repoUrl', 'db8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/manifesto/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/manifesto/', 'f14'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/manifesto/functions/getManifesto',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/manifesto/functions/getManifesto', 'b99'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/manifesto/functions/getManifestoInstance',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/manifesto/functions/getManifestoInstance', '392'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/task/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/task/', '056'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/task/functions/runTask',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/task/functions/runTask', '672'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/task/functions/runTs',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/task/functions/runTs', 'b9a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/terminal/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/terminal/', '0ce'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/terminal/functions/error',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/terminal/functions/error', '689'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/terminal/functions/log',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/terminal/functions/log', 'd7f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/terminal/functions/save',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/terminal/functions/save', '1f9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/terminal/functions/warn',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/terminal/functions/warn', '77a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/terminal/variables/default',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/terminal/variables/default', '822'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/uuid/',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/uuid/', '6c7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/server/utils/uuid/functions/uuid',
                component: ComponentCreator('/sveltekit-template/api/lib/server/utils/uuid/functions/uuid', 'c75'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/analytics/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/analytics/', 'b92'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/analytics/functions/init',
                component: ComponentCreator('/sveltekit-template/api/lib/services/analytics/functions/init', 'b25'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/', '397'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/functions/define',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/functions/define', '6d8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/functions/init',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/functions/init', '8d8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/table/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/table/', 'e36'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/table/classes/PaginatedTableData',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/table/classes/PaginatedTableData', '2d2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/table/classes/Table',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/table/classes/Table', '5a0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/table/classes/TableData',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/table/classes/TableData', 'f15'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/table/classes/TableDataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/table/classes/TableDataArr', '96f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/table/type-aliases/ReadConfig',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/table/type-aliases/ReadConfig', '93d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/type-aliases/SchemaDefinition',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/type-aliases/SchemaDefinition', '8ef'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/type-aliases/SchemaFieldReturnType',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/type-aliases/SchemaFieldReturnType', '1ee'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/type-aliases/SchemaFieldType',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/type-aliases/SchemaFieldType', '58e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/type-aliases/TableStructable',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/type-aliases/TableStructable', '8a6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/variables/DB',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/variables/DB', 'bc0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/db/variables/em',
                component: ComponentCreator('/sveltekit-template/api/lib/services/db/variables/em', 'a62'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/event-stack/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/event-stack/', '818'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/event-stack/classes/EventStack',
                component: ComponentCreator('/sveltekit-template/api/lib/services/event-stack/classes/EventStack', '545'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/event-stack/functions/createOverrideStack',
                component: ComponentCreator('/sveltekit-template/api/lib/services/event-stack/functions/createOverrideStack', 'd93'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/event-stack/functions/useCommandStack',
                component: ComponentCreator('/sveltekit-template/api/lib/services/event-stack/functions/useCommandStack', '8ea'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/event-stack/type-aliases/Command',
                component: ComponentCreator('/sveltekit-template/api/lib/services/event-stack/type-aliases/Command', 'c2f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/', 'dfe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/', 'cc4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/forceSync',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/forceSync', 'b11'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/getLastSynced',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/getLastSynced', '57b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/getTime',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/getTime', '7c2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/init',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/functions/init', '2f0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/variables/off',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/variables/off', '9b4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/variables/on',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/variables/on', '174'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/variables/once',
                component: ComponentCreator('/sveltekit-template/api/lib/services/ntp/namespaces/TimeService/variables/once', '357'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/session-manager/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/session-manager/', '6ed'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/session-manager/classes/Connection',
                component: ComponentCreator('/sveltekit-template/api/lib/services/session-manager/classes/Connection', '362'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/session-manager/classes/SessionManager',
                component: ComponentCreator('/sveltekit-template/api/lib/services/session-manager/classes/SessionManager', 'b74'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/sse/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/sse/', '0b3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/sse/variables/sse',
                component: ComponentCreator('/sveltekit-template/api/lib/services/sse/variables/sse', '03d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/', '7d3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/batching/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/batching/', 'aac'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/', '6ef'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/functions/add',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/functions/add', '676'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/type-aliases/Batch',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/type-aliases/Batch', 'b1d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/type-aliases/StructBatch',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/batching/namespaces/StructBatching/type-aliases/StructBatch', '9d4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/cache/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/cache/', '791'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/', '9cc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/functions/clear',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/functions/clear', '413'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/functions/get',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/functions/get', '35c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/functions/set',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/cache/namespaces/StructCache/functions/set', '499'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-arr/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-arr/', '595'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-arr/classes/DataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-arr/classes/DataArr', '429'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-arr/classes/PaginationDataArr',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-arr/classes/PaginationDataArr', '74d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-staging/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-staging/', 'ac5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-staging/classes/StructDataStage',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-staging/classes/StructDataStage', '97a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-version/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-version/', 'c50'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-version/classes/StructDataVersion',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-version/classes/StructDataVersion', '6f7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/data-version/type-aliases/VersionStructable',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/data-version/type-aliases/VersionStructable', '972'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct-data/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct-data/', '8c3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct-data/classes/StructData',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct-data/classes/StructData', '1c0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/', '887'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/classes/DataError',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/classes/DataError', '7ee'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/classes/FatalDataError',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/classes/FatalDataError', '907'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/classes/FatalStructError',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/classes/FatalStructError', '4e9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/classes/SingleWritable',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/classes/SingleWritable', 'c7a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/classes/Struct',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/classes/Struct', '7cd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/classes/StructError',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/classes/StructError', '295'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/classes/StructStream',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/classes/StructStream', 'd44'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/enumerations/FetchActions',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/enumerations/FetchActions', 'f71'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/interfaces/Socket',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/interfaces/Socket', '5f9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/Blank',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/Blank', '621'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/ColTsType',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/ColTsType', 'f6c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/GlobalCols',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/GlobalCols', '6f0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/PartialStructable',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/PartialStructable', 'a72'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/ReadConfig',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/ReadConfig', '905'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/SafeColTsType',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/SafeColTsType', 'ac1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/SafePartialStructable',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/SafePartialStructable', '06a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/StatusMessage',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/StatusMessage', 'c7f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/Structable',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/Structable', '4ad'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/StructBuilder',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/StructBuilder', 'ea3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/services/struct/struct/type-aliases/StructEvents',
                component: ComponentCreator('/sveltekit-template/api/lib/services/struct/struct/type-aliases/StructEvents', '5a2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/email/',
                component: ComponentCreator('/sveltekit-template/api/lib/types/email/', 'a3b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/email/type-aliases/Email',
                component: ComponentCreator('/sveltekit-template/api/lib/types/email/type-aliases/Email', '426'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/entitlements/',
                component: ComponentCreator('/sveltekit-template/api/lib/types/entitlements/', '231'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/entitlements/type-aliases/Entitlement',
                component: ComponentCreator('/sveltekit-template/api/lib/types/entitlements/type-aliases/Entitlement', 'f8a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/entitlements/type-aliases/Features',
                component: ComponentCreator('/sveltekit-template/api/lib/types/entitlements/type-aliases/Features', 'c5f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/entitlements/type-aliases/Group',
                component: ComponentCreator('/sveltekit-template/api/lib/types/entitlements/type-aliases/Group', 'bdd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/icons/',
                component: ComponentCreator('/sveltekit-template/api/lib/types/icons/', 'bba'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/icons/type-aliases/BootstrapIcon',
                component: ComponentCreator('/sveltekit-template/api/lib/types/icons/type-aliases/BootstrapIcon', 'fd0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/icons/type-aliases/FontAwesomeIcon',
                component: ComponentCreator('/sveltekit-template/api/lib/types/icons/type-aliases/FontAwesomeIcon', '149'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/icons/type-aliases/Icon',
                component: ComponentCreator('/sveltekit-template/api/lib/types/icons/type-aliases/Icon', '54b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/icons/type-aliases/IconTypes',
                component: ComponentCreator('/sveltekit-template/api/lib/types/icons/type-aliases/IconTypes', '3c4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/icons/type-aliases/MaterialIcon',
                component: ComponentCreator('/sveltekit-template/api/lib/types/icons/type-aliases/MaterialIcon', '361'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/icons/type-aliases/MaterialSymbol',
                component: ComponentCreator('/sveltekit-template/api/lib/types/icons/type-aliases/MaterialSymbol', '27c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/notification/',
                component: ComponentCreator('/sveltekit-template/api/lib/types/notification/', 'a71'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/notification/type-aliases/Notification',
                component: ComponentCreator('/sveltekit-template/api/lib/types/notification/type-aliases/Notification', 'ab5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/sse/',
                component: ComponentCreator('/sveltekit-template/api/lib/types/sse/', 'c34'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/sse/type-aliases/ConnectionState',
                component: ComponentCreator('/sveltekit-template/api/lib/types/sse/type-aliases/ConnectionState', 'd12'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/sse/variables/ConnectionStateSchema',
                component: ComponentCreator('/sveltekit-template/api/lib/types/sse/variables/ConnectionStateSchema', '8da'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/struct/',
                component: ComponentCreator('/sveltekit-template/api/lib/types/struct/', '226'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/struct/enumerations/DataAction',
                component: ComponentCreator('/sveltekit-template/api/lib/types/struct/enumerations/DataAction', '864'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/types/struct/enumerations/PropertyAction',
                component: ComponentCreator('/sveltekit-template/api/lib/types/struct/enumerations/PropertyAction', '997'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/buttons/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/buttons/', '160'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/buttons/classes/ButtonCellRenderer',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/buttons/classes/ButtonCellRenderer', '609'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/checkbox-select/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/checkbox-select/', 'a65'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/checkbox-select/classes/CheckBoxSelectRenderer',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/checkbox-select/classes/CheckBoxSelectRenderer', 'a75'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/checkbox-select/classes/HeaderCheckboxRenderer',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/checkbox-select/classes/HeaderCheckboxRenderer', '17f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/date-time/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/date-time/', '849'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/date-time/classes/DateTimeCellEditor',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/date-time/classes/DateTimeCellEditor', 'b94'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/search-select/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/search-select/', 'a6a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/search-select/classes/SearchSelectCellEditor',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/search-select/classes/SearchSelectCellEditor', '5f9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/ag-grid/search-select/type-aliases/SearchSelectCellEditorParams',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/ag-grid/search-select/type-aliases/SearchSelectCellEditorParams', 'b48'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/clipboard/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/clipboard/', '4bf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/clipboard/functions/copy',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/clipboard/functions/copy', '4cf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/clipboard/functions/copyCanvas',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/clipboard/functions/copyCanvas', '77d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/clipboard/functions/copyImage',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/clipboard/functions/copyImage', 'c75'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/contextmenu/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/contextmenu/', 'd00'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/contextmenu/functions/contextmenu',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/contextmenu/functions/contextmenu', '363'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/contextmenu/type-aliases/ContextMenuOptions',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/contextmenu/type-aliases/ContextMenuOptions', '617'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/countdown/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/countdown/', '58f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/countdown/classes/Countdown',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/countdown/classes/Countdown', '5c9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/downloads/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/downloads/', '5b6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/downloads/functions/downloadBlob',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/downloads/functions/downloadBlob', 'cb5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/downloads/functions/downloadText',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/downloads/functions/downloadText', '956'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/downloads/functions/downloadUrl',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/downloads/functions/downloadUrl', '4bb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/downloads/functions/loadFileContents',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/downloads/functions/loadFileContents', '494'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/downloads/functions/loadFiles',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/downloads/functions/loadFiles', 'fd0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/files/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/files/', '41f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/files/classes/FileUploader',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/files/classes/FileUploader', '41f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/fingerprint/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/fingerprint/', 'ba6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/fingerprint/functions/fingerprint',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/fingerprint/functions/fingerprint', 'ef3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/form/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/form/', 'a67'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/form/classes/Form',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/form/classes/Form', '44f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/form/classes/RangeSlider',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/form/classes/RangeSlider', '271'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/fullscreen/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/fullscreen/', 'dc8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/fullscreen/functions/fullscreen',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/fullscreen/functions/fullscreen', 'b88'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/generate-type/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/generate-type/', 'cb7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/generate-type/functions/toType',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/generate-type/functions/toType', 'c96'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/generate-type/functions/toZodType',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/generate-type/functions/toZodType', '2ed'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/keybinds/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/keybinds/', 'd82'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/keybinds/classes/Keyboard',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/keybinds/classes/Keyboard', 'e7e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/keybinds/type-aliases/KeyCombo',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/keybinds/type-aliases/KeyCombo', 'd6b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/keybinds/type-aliases/KeyName',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/keybinds/type-aliases/KeyName', '11b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/keybinds/type-aliases/Modifier',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/keybinds/type-aliases/Modifier', 'eb7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/pages/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/pages/', 'c44'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/pages/functions/getTitle',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/pages/functions/getTitle', '5f3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/', '969'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/alert',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/alert', '4dc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/choose',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/choose', '6b8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/clearModals',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/clearModals', 'efd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/colorPicker',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/colorPicker', '222'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/confirm',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/confirm', '9b2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/createButtons',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/createButtons', '5c1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/notify',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/notify', '914'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/prompt',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/prompt', '4c6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/rawModal',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/rawModal', '0f5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/functions/select',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/functions/select', 'c3f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/variables/history',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/variables/history', '3db'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/variables/modalTarget',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/variables/modalTarget', '7fc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/prompts/variables/notifs',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/prompts/variables/notifs', '1e4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/', '41a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/', '257'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/get',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/get', 'eed'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/post',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/post', '549'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/setMeta',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/setMeta', '95f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/uploadFiles',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/functions/uploadFiles', 'bdb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/type-aliases/GetConfig',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/type-aliases/GetConfig', '2b4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/type-aliases/PostConfig',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/type-aliases/PostConfig', '809'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/requests/namespaces/Requests/variables/metadata',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/requests/namespaces/Requests/variables/metadata', '4b4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/stack/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/stack/', '93e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/stack/classes/Stack',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/stack/classes/Stack', '4be'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/theme/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/theme/', '1e4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/theme/functions/setTheme',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/theme/functions/setTheme', '5ba'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/theme/variables/theme',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/theme/variables/theme', '22e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/writables/',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/writables/', 'b49'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/writables/classes/WritableArray',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/writables/classes/WritableArray', '21d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/utils/writables/classes/WritableBase',
                component: ComponentCreator('/sveltekit-template/api/lib/utils/writables/classes/WritableBase', '99f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/lib/variables/ogFetch',
                component: ComponentCreator('/sveltekit-template/api/lib/variables/ogFetch', '3e9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/+layout/',
                component: ComponentCreator('/sveltekit-template/api/routes/+layout/', '8e7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/[username]/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/[username]/+page.server/', 'ede'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/[username]/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/account/[username]/+page.server/functions/load', '77d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/manage-profile/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/manage-profile/+page.server/', '1d9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/manage-profile/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/account/manage-profile/+page.server/functions/load', 'd02'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/password-reset/[id]/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/password-reset/[id]/+page.server/', '03a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/password-reset/[id]/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/account/password-reset/[id]/+page.server/functions/load', '01d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/password-reset/[id]/+page.server/variables/actions',
                component: ComponentCreator('/sveltekit-template/api/routes/account/password-reset/[id]/+page.server/variables/actions', '55c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/password-reset/[id]/+page/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/password-reset/[id]/+page/', '1fc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/password-reset/[id]/+page/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/account/password-reset/[id]/+page/functions/load', '16b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/profile/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/profile/+server/', '8cc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/profile/+server/functions/POST',
                component: ComponentCreator('/sveltekit-template/api/routes/account/profile/+server/functions/POST', '7ea'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/settings/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/settings/+page.server/', '093'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/settings/+page/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/settings/+page/', '0e0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/sign-in/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/sign-in/+page.server/', '664'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/sign-in/+page.server/variables/actions',
                component: ComponentCreator('/sveltekit-template/api/routes/account/sign-in/+page.server/variables/actions', '1fc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/sign-out/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/sign-out/+page.server/', 'ff2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/sign-out/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/account/sign-out/+page.server/functions/load', '783'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/sign-out/+page.server/variables/actions',
                component: ComponentCreator('/sveltekit-template/api/routes/account/sign-out/+page.server/variables/actions', '865'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/sign-up/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/account/sign-up/+page.server/', '03b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/account/sign-up/+page.server/variables/actions',
                component: ComponentCreator('/sveltekit-template/api/routes/account/sign-up/+page.server/variables/actions', '048'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/api/+server/', '6c8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/api/+server/functions/GET', '62a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/oauth/sign-in/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/api/oauth/sign-in/+server/', '025'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/oauth/sign-in/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/api/oauth/sign-in/+server/functions/GET', '93f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/oauth/sign-up/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/api/oauth/sign-up/+server/', '890'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/oauth/sign-up/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/api/oauth/sign-up/+server/functions/GET', '534'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/sse/ack/[uuid]/[id]/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/api/sse/ack/[uuid]/[id]/+server/', '374'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/sse/ack/[uuid]/[id]/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/api/sse/ack/[uuid]/[id]/+server/functions/GET', '4a4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/sse/init/[uuid]/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/api/sse/init/[uuid]/+server/', 'faa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/sse/init/[uuid]/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/api/sse/init/[uuid]/+server/functions/GET', '241'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/sse/ping/[uuid]/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/api/sse/ping/[uuid]/+server/', '3e3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/api/sse/ping/[uuid]/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/api/sse/ping/[uuid]/+server/functions/GET', 'bc4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/assets/[...filepath]/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/assets/[...filepath]/+server/', 'fe4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/assets/[...filepath]/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/assets/[...filepath]/+server/functions/GET', 'ba1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/+server/', 'e2f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/+server/functions/GET', 'da6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/account/[accountId]/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/account/[accountId]/+page.server/', 'b26'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/account/[accountId]/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/account/[accountId]/+page.server/functions/load', '0cb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/account/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/account/+page.server/', '569'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/account/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/account/+page.server/functions/load', '2ae'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/account/+page/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/account/+page/', '806'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/account/+page/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/account/+page/functions/load', 'd09'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/analytics/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/analytics/+page.server/', '745'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/analytics/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/analytics/+page.server/functions/load', '75d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page.server/', 'bf7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page.server/functions/load', 'ffe'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page/', '66c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/data/[struct]/+page/functions/load', '562'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/data/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/data/+page.server/', '9f9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/data/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/data/+page.server/functions/load', '4ce'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/logs/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/logs/+page.server/', '632'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/logs/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/logs/+page.server/functions/load', 'f1f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page.server/', '8c2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page.server/functions/load', '854'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page/', '8b9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/[roleId]/+page/functions/load', '866'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/+page.server/', '56f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/+page.server/functions/load', '76b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/+page/',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/+page/', '6e5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/dashboard/admin/role/+page/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/dashboard/admin/role/+page/functions/load', 'e7d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/examples/sse/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/examples/sse/+page.server/', '720'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/examples/struct/ssr/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/examples/struct/ssr/+page.server/', 'ea8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/examples/struct/ssr/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/examples/struct/ssr/+page.server/functions/load', '424'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/files/[fileId]/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/files/[fileId]/+server/', '734'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/files/[fileId]/+server/functions/GET',
                component: ComponentCreator('/sveltekit-template/api/routes/files/[fileId]/+server/functions/GET', 'e88'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/files/[fileId]/+server/functions/POST',
                component: ComponentCreator('/sveltekit-template/api/routes/files/[fileId]/+server/functions/POST', 'ef2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/test/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/test/+page.server/', 'fbf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/test/account/+page.server/',
                component: ComponentCreator('/sveltekit-template/api/routes/test/account/+page.server/', '5ed'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/test/account/+page.server/functions/load',
                component: ComponentCreator('/sveltekit-template/api/routes/test/account/+page.server/functions/load', 'ff3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/test/sse/init/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/test/sse/init/+server/', '8fd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/test/sse/init/+server/functions/POST',
                component: ComponentCreator('/sveltekit-template/api/routes/test/sse/init/+server/functions/POST', '0de'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/test/upload/+server/',
                component: ComponentCreator('/sveltekit-template/api/routes/test/upload/+server/', '90c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/routes/test/upload/+server/functions/POST',
                component: ComponentCreator('/sveltekit-template/api/routes/test/upload/+server/functions/POST', '8b9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/tests/run-task.test/',
                component: ComponentCreator('/sveltekit-template/api/tests/run-task.test/', '5df'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/tests/struct.test/',
                component: ComponentCreator('/sveltekit-template/api/tests/struct.test/', '186'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/tests/task-import/',
                component: ComponentCreator('/sveltekit-template/api/tests/task-import/', '1c4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/tests/task-import/functions/test',
                component: ComponentCreator('/sveltekit-template/api/tests/task-import/functions/test', 'f07'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/',
                component: ComponentCreator('/sveltekit-template/api/types/app/', 'd2c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/namespaces/App/',
                component: ComponentCreator('/sveltekit-template/api/types/app/namespaces/App/', 'c09'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/namespaces/App/interfaces/Error',
                component: ComponentCreator('/sveltekit-template/api/types/app/namespaces/App/interfaces/Error', '883'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/namespaces/App/interfaces/Locals',
                component: ComponentCreator('/sveltekit-template/api/types/app/namespaces/App/interfaces/Locals', '709'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/namespaces/App/interfaces/PageData',
                component: ComponentCreator('/sveltekit-template/api/types/app/namespaces/App/interfaces/PageData', '4ab'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/namespaces/App/interfaces/PageState',
                component: ComponentCreator('/sveltekit-template/api/types/app/namespaces/App/interfaces/PageState', '57c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/namespaces/App/interfaces/Platform',
                component: ComponentCreator('/sveltekit-template/api/types/app/namespaces/App/interfaces/Platform', 'e49'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/app/variables/APP_ENV',
                component: ComponentCreator('/sveltekit-template/api/types/app/variables/APP_ENV', '70f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/broprint/',
                component: ComponentCreator('/sveltekit-template/api/types/broprint/', '190'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/broprint/functions/getCurrentBrowserFingerPrint',
                component: ComponentCreator('/sveltekit-template/api/types/broprint/functions/getCurrentBrowserFingerPrint', '15c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/document-extended/',
                component: ComponentCreator('/sveltekit-template/api/types/document-extended/', '9ee'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/document-extended/functions/create',
                component: ComponentCreator('/sveltekit-template/api/types/document-extended/functions/create', '1be'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/document-extended/functions/createDeep',
                component: ComponentCreator('/sveltekit-template/api/types/document-extended/functions/createDeep', 'd68'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/document-extended/functions/find',
                component: ComponentCreator('/sveltekit-template/api/types/document-extended/functions/find', 'ec7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/document-extended/functions/findAll',
                component: ComponentCreator('/sveltekit-template/api/types/document-extended/functions/findAll', '648'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/document-extended/variables/recaptchaSiteKey',
                component: ComponentCreator('/sveltekit-template/api/types/document-extended/variables/recaptchaSiteKey', '446'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/svelte-filepond/',
                component: ComponentCreator('/sveltekit-template/api/types/svelte-filepond/', '632'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/svelte-filepond/classes/default',
                component: ComponentCreator('/sveltekit-template/api/types/svelte-filepond/classes/default', '153'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/svelte-filepond/functions/registerPlugin',
                component: ComponentCreator('/sveltekit-template/api/types/svelte-filepond/functions/registerPlugin', 'd72'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/svelte-filepond/functions/supported',
                component: ComponentCreator('/sveltekit-template/api/types/svelte-filepond/functions/supported', '776'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/svelte-filepond/interfaces/FilePondFile',
                component: ComponentCreator('/sveltekit-template/api/types/svelte-filepond/interfaces/FilePondFile', 'e4e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/svelte-filepond/interfaces/FilePondProps',
                component: ComponentCreator('/sveltekit-template/api/types/svelte-filepond/interfaces/FilePondProps', 'f73'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/api/types/svelte-filepond/type-aliases/FilePondEvent',
                component: ComponentCreator('/sveltekit-template/api/types/svelte-filepond/type-aliases/FilePondEvent', '313'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/config/',
                component: ComponentCreator('/sveltekit-template/config/', '0b8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/diagrams/',
                component: ComponentCreator('/sveltekit-template/diagrams/', '0fa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/e2e/',
                component: ComponentCreator('/sveltekit-template/e2e/', '602'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/scripts/',
                component: ComponentCreator('/sveltekit-template/scripts/', '5da'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/sveltekit-template/',
                component: ComponentCreator('/sveltekit-template/', '863'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
