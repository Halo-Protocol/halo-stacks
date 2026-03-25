import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/',
    component: ComponentCreator('/', '3f7'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '7e8'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '7e9'),
            routes: [
              {
                path: '/developers/api',
                component: ComponentCreator('/developers/api', '677'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developers/contracts',
                component: ComponentCreator('/developers/contracts', '6a5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developers/integration',
                component: ComponentCreator('/developers/integration', '2f0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/governance/admin',
                component: ComponentCreator('/governance/admin', 'd88'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/creating-a-circle',
                component: ComponentCreator('/guides/creating-a-circle', '66f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/faucet',
                component: ComponentCreator('/guides/faucet', '083'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/getting-started',
                component: ComponentCreator('/guides/getting-started', '86d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/guides/wallet-setup',
                component: ComponentCreator('/guides/wallet-setup', '8f4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/overview/how-it-works',
                component: ComponentCreator('/overview/how-it-works', 'b3d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/overview/tokenomics',
                component: ComponentCreator('/overview/tokenomics', 'f61'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/overview/what-is-halo',
                component: ComponentCreator('/overview/what-is-halo', '4f7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/protocol/circles',
                component: ComponentCreator('/protocol/circles', 'abb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/protocol/credit-scoring',
                component: ComponentCreator('/protocol/credit-scoring', '882'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/protocol/identity',
                component: ComponentCreator('/protocol/identity', '284'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/protocol/overview',
                component: ComponentCreator('/protocol/overview', 'dd9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/protocol/sbtc-staking',
                component: ComponentCreator('/protocol/sbtc-staking', 'a4a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/protocol/vault',
                component: ComponentCreator('/protocol/vault', '4fc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/resources/faq',
                component: ComponentCreator('/resources/faq', 'd86'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/resources/glossary',
                component: ComponentCreator('/resources/glossary', 'ae2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/resources/security',
                component: ComponentCreator('/resources/security', 'c9a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'bea'),
                exact: true,
                sidebar: "docs"
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
