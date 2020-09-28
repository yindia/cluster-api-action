# Github Action for deploying cluster api component 

Note : Under development

### Uses 

1. AWS
```
- uses: evalsocket/cluster-api-actions/cluster-api@master
  with:
    kubeconfig: '<your kubeconfig>'v# Use secret (https://developer.github.com/actions/managing-workflows/storing-secrets/)
    capi-provider: 'aws'
    capi-provider-version: 'v0.6.0'
    capi-version : 'v0.3.9'
    secret : 'YXNkYmhqdmFz'
  id: capi-aws
```

2. GCP
```
- uses: evalsocket/cluster-api-actions/cluster-api@master
  with:
    kubeconfig: '<your kubeconfig>'v# Use secret (https://developer.github.com/actions/managing-workflows/storing-secrets/)
    capi-provider: 'gcp'
    capi-provider-version: 'v0.6.0'
    capi-version : 'v0.3.9'
    secret : 'YXNkYmhqdmFz'
  id: capi-gcp
```

3. Vsphere
```
- uses: evalsocket/cluster-api-actions/cluster-api@master
  with:
    kubeconfig: '<your kubeconfig>'v# Use secret (https://developer.github.com/actions/managing-workflows/storing-secrets/)
    capi-provider: 'vsphere'
    capi-provider-version: 'v0.6.0'
    capi-version : 'v0.3.9'
    username : 'test'
    password : 'test'
  id: capi-vsphere
```


3. Packet
```
- uses: evalsocket/cluster-api-actions/cluster-api@master
  with:
    kubeconfig: '<your kubeconfig>'v# Use secret (https://developer.github.com/actions/managing-workflows/storing-secrets/)
    capi-provider: 'packet'
    capi-provider-version: 'v0.6.0'
    capi-version : 'v0.3.9'
    secret : 'YXNkYmhqdmFz'
  id: capi-vsphere
```

4. Clusterctl Action
```
- uses: evalsocket/cluster-api-actions/clusterctl@master
  with:
    clusterctl_version : 'v0.3.9'
  id: clusterctl
```
