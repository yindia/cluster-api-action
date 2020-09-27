# cluster-api-action (experiment)
Github Action for deploying cluster api component 


```
- uses: evalsocket/cluster-api-actions/cluster-api@master
  with:
    kubeconfig: '<your kubeconfig>'v# Use secret (https://developer.github.com/actions/managing-workflows/storing-secrets/)
    context: '<context name>'  # Optional, uses the current-context from kubeconfig by default
    capi-provider: 'aws'
    capi-provider-version: 'v1.0.0'
    capi-version : ''
  id: capi-aws
```