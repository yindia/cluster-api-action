import * as core from '@actions/core';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as toolCache from '@actions/tool-cache';
import * as os from 'os';

const clusterctlToolName = 'clusterctl';

function getkubectlDownloadURL(version: string): string {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://github.com/kubernetes-sigs/cluster-api/releases/download/%s/clusterctl-linux-amd64', version);

        case 'Darwin':
            return util.format('https://github.com/kubernetes-sigs/cluster-api/releases/download/%s/clusterctl-darwin-amd64', version);
            
    }
}

async function downloadClusterctl(version: string): Promise<string> {
    let cachedToolpath = toolCache.find(clusterctlToolName, version);
    let clusterctlDownloadPath = '';
    if (!cachedToolpath) {
        try {
            clusterctlDownloadPath = await toolCache.downloadTool(getkubectlDownloadURL(version));
        } catch (exception) {
            throw new Error('DownloadclusterctlFailed');
        }

        cachedToolpath = await toolCache.cacheFile(clusterctlDownloadPath, clusterctlToolName + getExecutableExtension(), clusterctlToolName, version);
    }

    const clusterPath = path.join(cachedToolpath, clusterctlToolName + getExecutableExtension());
    fs.chmodSync(clusterPath, '777');
    return clusterPath;
}

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

async function run() {
    let version = core.getInput('clusterctl_version', { 'required': true });
    let cachedPath = await downloadClusterctl(version);
    console.log(`clusterctl tool version: '${version}' has been cached at ${cachedPath}`);
    core.setOutput('kubectl-path', cachedPath);
}

run().catch(core.setFailed);