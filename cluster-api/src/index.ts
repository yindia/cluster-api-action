import * as core from '@actions/core';
import { issueCommand } from '@actions/core/lib/command';
import * as path from 'path';
import * as fs from 'fs';
import * as io from '@actions/io';
import * as toolCache from '@actions/tool-cache';
import * as os from 'os';
import { ToolRunner } from "@actions/exec/lib/toolrunner";

function getKubeconfig(): string {
    const kubeconfig = core.getInput('kubeconfig');
    if (kubeconfig) {
        core.debug("Setting context using kubeconfig");
        return kubeconfig;
    }
    const clusterUrl = core.getInput('k8s-url', { required: true });
    core.debug("Found clusterUrl, creating kubeconfig using certificate and token");
    let token = Buffer.from(core.getInput('k8s-secret'), 'base64').toString();
    const kubeconfigObject = {
        "apiVersion": "v1",
        "kind": "Config",
        "clusters": [
            {
                "cluster": {
                    "server": clusterUrl
                }
            }
        ],
        "users": [
            {
                "user": {
                    "token": token
                }
            }
        ]
    };

    return JSON.stringify(kubeconfigObject);
}

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

async function getKubectlPath() {
    let kubectlPath = await io.which('kubectl', false);
    if (!kubectlPath) {
        const allVersions = toolCache.findAllVersions('kubectl');
        kubectlPath = allVersions.length > 0 ? toolCache.find('kubectl', allVersions[0]) : '';
        if (!kubectlPath) {
            throw new Error('Kubectl is not installed');
        }

        kubectlPath = path.join(kubectlPath, `kubectl${getExecutableExtension()}`);
    }
    return kubectlPath;
}

async function getCurlPath() {
    let curlPath = await io.which('curl', false);
    if (!curlPath) {
        const allVersions = toolCache.findAllVersions('curl');
        curlPath = allVersions.length > 0 ? toolCache.find('curl', allVersions[0]) : '';
        if (!curlPath) {
            throw new Error('curl is not installed');
        }

        curlPath = path.join(curlPath, `curl${getExecutableExtension()}`);
    }
    return curlPath;
}

async function getSedPath() {
    let sedPath = await io.which('sed', false);
    if (!sedPath) {
        const allVersions = toolCache.findAllVersions('sed');
        sedPath = allVersions.length > 0 ? toolCache.find('sed', allVersions[0]) : '';
        if (!sedPath) {
            throw new Error('sed is not installed');
        }
        sedPath = path.join(sedPath, `sed${getExecutableExtension()}`);
    }
    return sedPath;
}

async function setContext() {
    let context = core.getInput('context');
    if (context) {
        const kubectlPath = await getKubectlPath();
        let toolRunner = new ToolRunner(kubectlPath, ['config', 'use-context', context]);
        await toolRunner.exec();
        toolRunner = new ToolRunner(kubectlPath, ['config', 'current-context']);
        await toolRunner.exec();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function installCapi() {
    let version = core.getInput('capi-version');
    const kubectlPath = await getKubectlPath();
    if (version) {
        let url = "https://github.com/jetstack/cert-manager/releases/download/v1.0.2/cert-manager.yaml"
        if (url) {
            core.debug(`Installing cert-manager`);
            let toolRunner = new ToolRunner(kubectlPath, ['apply', '-f', url]);
            await toolRunner.exec();
            core.debug(`Waiting for cert-manager to be available`);
            await sleep(50000);


            core.debug(`Installing Provider=cluster-api Version=`+ version + `TargetNamespace=capi-system`);
            url = "https://github.com/kubernetes-sigs/cluster-api/releases/download/"+ version +"/cluster-api-components.yaml"
            toolRunner = new ToolRunner(kubectlPath, ['apply', '-f', url]);
            await toolRunner.exec();

            core.debug(`Waiting to be available Provider=cluster-api Version=`+ version + `TargetNamespace=capi-system`);
            await sleep(10000);

            core.debug(`Installing Provider=bootstrap-kubeadm Version=`+ version + `TargetNamespace=capi-kubeadm-bootstrap-system`);
            url = "https://github.com/kubernetes-sigs/cluster-api/releases/download/"+ version +"/bootstrap-components.yaml"
            toolRunner = new ToolRunner(kubectlPath, ['apply', '-f', url]);
            await toolRunner.exec();

            core.debug(`Waiting to be available Provider=bootstrap-kubeadm Version=`+ version + `TargetNamespace=capi-kubeadm-bootstrap-system`);
            await sleep(10000);

            core.debug(`Installing Provider=control-plane-kubeadm Version=`+ version + `TargetNamespace=capi-kubeadm-control-plane-system`);
            url = "https://github.com/kubernetes-sigs/cluster-api/releases/download/"+ version +"/control-plane-components.yaml"
            toolRunner = new ToolRunner(kubectlPath, ['apply', '-f', url]);
            await toolRunner.exec();

            core.debug(`Waiting to be available Provider=control-plane-kubeadm Version=`+ version + `TargetNamespace=capi-kubeadm-control-plane-system`);
            await sleep(10000);

            let provider = core.getInput('capi-provider');
            if (provider) {
                core.debug(`Installing Cluster API Provider ${provider} Component`);
                let version = core.getInput('capi-provider-version');
                if (version) {
                    url = "https://github.com/kubernetes-sigs/cluster-api-provider-"+ provider +"/releases/download/"+ version +"/infrastructure-components.yaml"
                    await installProvider(url,provider)
                }
            }

        }
    }
}

async function installProvider(url :string,provider :string){
    const curlPath = await getCurlPath()
    const sedPath = await getSedPath()
    const kubectlPath = await getKubectlPath();
    const homedir = os.homedir();
    let tempFile = path.join(homedir, 'infrastructure-components.yaml')
    let toolRunner = new ToolRunner(curlPath, ['-Lo',tempFile, url]);
    await toolRunner.exec();
    let replace
    let secret = core.getInput('secret');
    if (secret) {
        if (provider == "aws") {
            replace = "s/${AWS_B64ENCODED_CREDENTIALS}/"+secret+"/g"
        }else if (provider == "packet") {
            replace = "s/${PACKET_API_KEY}/"+secret+"/g"
        }else if (provider == "gcp") {
            replace = "s/${GCP_B64ENCODED_CREDENTIALS}/"+secret+"/g"
        }else if (provider == "vsphere") {
            let username = core.getInput('username');
            let password = core.getInput('password');
            if (username && password){
                    replace = "s/${VSPHERE_USERNAME}/" +username +"/g;s/${VSPHERE_PASSWORD}/" +password +"/g"
            }
        }
        toolRunner = new ToolRunner(sedPath, ['-ie',replace,tempFile]);
        await toolRunner.exec();
    }
    toolRunner = new ToolRunner(kubectlPath, ['apply', '-f', tempFile]);
    await toolRunner.exec();
}

async function run() {
    let kubeconfig = getKubeconfig();
    const runnerTempDirectory = process.env['RUNNER_TEMP']; // Using process.env until the core libs are updated
    const kubeconfigPath = path.join(runnerTempDirectory, `kubeconfig_${Date.now()}`);
    core.debug(`Writing kubeconfig contents to ${kubeconfigPath}`);
    fs.writeFileSync(kubeconfigPath, kubeconfig);
    issueCommand('set-env', { name: 'KUBECONFIG' }, kubeconfigPath);
    console.log('KUBECONFIG environment variable is set');
    await setContext();
    core.debug(`Started installing Cluster API Component`);
    await installCapi()
}

run().catch(core.setFailed);