const utils = require('@utils');

const { BRANCH, TAG } = process.env;
const loginPage = require('@page-objects/default/login/login.wdio.page');
const upgradePage = require('@page-objects/upgrade/upgrade.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const adminPage = require('@page-objects/default/admin/admin.wdio.page');
const constants = require('@constants');
const version = require('../../../scripts/build/versions');
const dataFactory = require('@factories/cht/generate');
const common = require('@page-objects/default/common/common.wdio.page');

const docs = dataFactory.createHierarchy({
  name: 'offlineupgrade',
  user: true,
  nbrClinics: 1,
  nbrPersons: 1,
});


const getDdocs = async () => {
  const result = await utils.requestOnMedicDb({
    path: '/_all_docs',
    qs: {
      start_key: JSON.stringify('_design'),
      end_key: JSON.stringify('_design\ufff0'),
      include_docs: true,
    },
  });

  return result.rows.map(row => row.doc);
};

describe('Performing an upgrade', () => {
  before(async () => {
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);

    await loginPage.login(docs.user);
    await commonPage.logout();

    await loginPage.cookieLogin({
      username: constants.USERNAME,
      password: constants.PASSWORD,
      createUser: false
    });
  });

  it('should upgrade to current branch', async () => {
    await upgradePage.goToUpgradePage();
    await upgradePage.expandPreReleasesAccordion();

    const installButton = await upgradePage.getInstallButton(BRANCH, TAG);
    await installButton.click();

    const confirm = await upgradePage.upgradeModalConfirm();
    await confirm.click();

    await (await upgradePage.cancelUpgradeButton()).waitForDisplayed();
    await (await upgradePage.deploymentInProgress()).waitForDisplayed();
    await (await upgradePage.deploymentInProgress()).waitForDisplayed({ reverse: true, timeout: 100000 });

    await (await upgradePage.deploymentComplete()).waitForDisplayed();

    const currentVersion = await upgradePage.getCurrentVersion();
    expect(version.getVersion(true)).to.include(currentVersion);

    await browser.refresh(); // load updated code of admin app
    await upgradePage.goToUpgradePage();
    const currentBuild = await upgradePage.getBuild();

    // there should be no staged ddocs
    const ddocs = await getDdocs();
    const staged = ddocs.filter(ddoc => ddoc._id.includes('staged'));
    expect(staged.length).to.equal(0);

    ddocs.forEach(ddoc => expect(ddoc.version).to.equal(currentBuild));

    await adminPage.logout();
    await loginPage.login(docs.user);
    await commonPage.closeReloadModal(true);

    await common.goToAboutPage();
    expect(await upgradePage.getCurrentVersion()).to.include(TAG ? TAG : `${BRANCH} (`);
  });
});
