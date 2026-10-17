targetScope = 'resourceGroup'

@description('Identifiant de laboratoire ; aucune application n’est déployée.')
@minLength(3)
@maxLength(20)
param prefix string = 'proofkit-lab'

@description('Région du groupe de ressources existant, à confirmer avant déploiement.')
param location string = resourceGroup().location

param networkCidr string = '10.80.0.0/16'
param proverSubnetCidr string = '10.80.1.0/24'
param verifierSubnetCidr string = '10.80.2.0/24'

var roles = ['prover', 'verifier']
var subnetCidrs = [proverSubnetCidr, verifierSubnetCidr]

resource identities 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = [for role in roles: {
  name: '${prefix}-${role}'
  location: location
  tags: { purpose: 'experimental-network-foundation' }
}]

resource networkGuards 'Microsoft.Network/networkSecurityGroups@2024-05-01' = [for role in roles: {
  name: '${prefix}-${role}-nsg'
  location: location
  properties: {
    securityRules: [for direction in ['Inbound', 'Outbound']: {
      name: 'DenyAll${direction}'
      properties: {
        priority: 4096
        direction: direction
        access: 'Deny'
        protocol: '*'
        sourcePortRange: '*'
        destinationPortRange: '*'
        sourceAddressPrefix: '*'
        destinationAddressPrefix: '*'
      }
    }]
  }
}]

resource network 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: '${prefix}-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: [networkCidr] }
    subnets: [for (role, i) in roles: {
      name: role
      properties: {
        addressPrefix: subnetCidrs[i]
        networkSecurityGroup: { id: networkGuards[i].id }
      }
    }]
  }
}

output networkId string = network.id
output identitiesWithoutPermissions array = [for (role, i) in roles: {
  role: role
  resourceId: identities[i].id
  principalId: identities[i].properties.principalId
}]
