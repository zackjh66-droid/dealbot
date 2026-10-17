const REPO = 'zackjh66-droid/dealbot';

export const revalidate = 300;

export const metadata = {
  title: 'Downloads · Project Zero',
  description: 'Download Project Zero Xbox Developer Mode packages when a signed release is available.'
};

function isXboxPackage(asset) {
  return /\.(msix|msixbundle|appx|appxbundle|zip)$/i.test(asset?.name || '');
}

async function getLatestRelease() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Project-Zero-Web'
      },
      next: { revalidate: 300 }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function findAsset(assets, matcher) {
  return assets.find((asset) => isXboxPackage(asset) && matcher.test(asset.name));
}

function DownloadAction({ asset, label }) {
  if (!asset) {
    return <span className="download-action disabled">COMING SOON</span>;
  }

  return (
    <a className="download-action" href={asset.browser_download_url}>
      {label}
    </a>
  );
}

export default async function DownloadsPage() {
  const release = await getLatestRelease();
  const assets = Array.isArray(release?.assets) ? release.assets : [];

  const launcher = findAsset(assets, /(launcher|project[-_ ]?zero).*(msix|appx)|(?:msix|appx).*(launcher)/i);
  const clientBridge = findAsset(assets, /(client[-_ ]?bridge|bridge).*(msix|appx)|(?:msix|appx).*(client[-_ ]?bridge|bridge)/i);

  return (
    <div className="container page downloads-page">
      <div className="page-head">
        <span className="eyebrow">Xbox Dev Mode</span>
        <h1>Downloads</h1>
        <p>
          Signed Project Zero packages will appear here as soon as they are published in the public release.
          The website checks the latest GitHub release automatically, so this page does not need to be manually
          edited every time a new package ships.
        </p>
      </div>

      <div className="download-release-bar">
        <span>Latest public release</span>
        <b>{release ? `${release.name || release.tag_name} · ${release.published_at ? new Date(release.published_at).toLocaleDateString('en-GB') : 'published'}` : 'No signed public release yet'}</b>
      </div>

      <div className="download-list">
        <section className="download-row">
          <div>
            <span className="download-kicker">Primary package</span>
            <h2 className="download-title">Project Zero Launcher</h2>
            <span className="download-status">Xbox · UWP · x64</span>
          </div>
          <div className="download-copy">
            <p>
              The main Xbox Developer Mode launcher. It handles console linking, local content verification,
              session creation and the handoff to the client package.
            </p>
            <div className="download-meta">
              <span>Developer Mode required</span>
              <span>Signed package required</span>
              <span>{launcher ? launcher.name : 'Build not publicly released'}</span>
            </div>
          </div>
          <DownloadAction asset={launcher} label="DOWNLOAD UWP" />
        </section>

        <section className="download-row">
          <div>
            <span className="download-kicker">Companion package</span>
            <h2 className="download-title">Client Bridge</h2>
            <span className="download-status">Xbox · UWP · x64</span>
          </div>
          <div className="download-copy">
            <p>
              Receives the Project Zero launch protocol from the launcher and carries the authenticated handoff
              into the Xbox-side client workflow.
            </p>
            <div className="download-meta">
              <span>Protocol: projectzero-game</span>
              <span>Install after launcher</span>
              <span>{clientBridge ? clientBridge.name : 'Build not publicly released'}</span>
            </div>
          </div>
          <DownloadAction asset={clientBridge} label="DOWNLOAD BRIDGE" />
        </section>

        <section className="download-row">
          <div>
            <span className="download-kicker">Game content</span>
            <h2 className="download-title">Season 7 Content</h2>
            <span className="download-status">7.00 · CL-4629139</span>
          </div>
          <div className="download-copy">
            <p>
              Original Fortnite game content is not bundled with Project Zero downloads. The launcher is designed
              to work with content you are authorised to hold and verifies the local files before use.
            </p>
            <div className="download-meta">
              <span>Separate from launcher</span>
              <span>SHA-256 verification</span>
              <span>Not redistributed here</span>
            </div>
          </div>
          <span className="download-action disabled">NOT BUNDLED</span>
        </section>
      </div>

      <p className="download-note">
        Packages shown as “Coming soon” have not been published as a signed public release yet. Once matching
        MSIX/AppX assets are added to the latest GitHub release, their download buttons become active automatically.
      </p>
    </div>
  );
}
