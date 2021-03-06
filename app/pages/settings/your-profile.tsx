import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Head from 'next/head';
import NProgress from 'nprogress';
import * as React from 'react';

import SettingList from '../../components/common/SettingList';
import {
  getSignedRequestForUpload,
  uploadFileUsingSignedPutRequest,
} from '../../lib/api/team-member';
import notify from '../../lib/notifier';
import { Store } from '../../lib/store';
import withAuth from '../../lib/withAuth';
import withLayout from '../../lib/withLayout';

const styleGrid = {
  height: '100%',
};

const styleGridItem = {
  padding: '0px 20px',
  borderRight: '0.5px #aaa solid',
};

type MyProps = { store: Store; isTL: boolean };
type MyState = { newName: string; newAvatarUrl: string; disabled: boolean };

class YourProfile extends React.Component<MyProps, MyState> {
  constructor(props) {
    super(props);

    this.state = {
      newName: this.props.store.currentUser.displayName,
      newAvatarUrl: this.props.store.currentUser.avatarUrl,
      disabled: false,
    };
  }

  public onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { currentUser } = this.props.store;

    const { newName, newAvatarUrl } = this.state;

    if (!newName) {
      notify('Name is required');
      return;
    }

    NProgress.start();

    try {
      this.setState({ disabled: true });

      await currentUser.updateProfile({ name: newName, avatarUrl: newAvatarUrl });
      notify('You successfully updated your profile.');
    } catch (error) {
      notify(error);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  public uploadFile = async () => {
    const { store } = this.props;
    const { currentUser } = store;

    const file = document.getElementById('upload-file').files[0];
    document.getElementById('upload-file').value = '';
    const bucket = 'saas-teams-avatars';
    const prefix = `${currentUser.slug}`;

    if (file == null) {
      return notify('No file selected.');
    }

    NProgress.start();

    try {
      this.setState({ disabled: true });

      const responseFromApiServerForUpload = await getSignedRequestForUpload({
        file,
        prefix,
        bucket,
        acl: 'public-read',
      });

      await uploadFileUsingSignedPutRequest(file, responseFromApiServerForUpload.signedRequest, {
        'Cache-Control': 'max-age=2592000',
      });

      this.setState({
        newAvatarUrl: responseFromApiServerForUpload.url,
      });

      await currentUser.updateProfile({
        name: this.state.newName,
        avatarUrl: this.state.newAvatarUrl,
      });

      NProgress.done();
      notify('You successfully uploaded new photo.');
    } catch (error) {
      NProgress.done();
      notify(error);
      NProgress.done();
    } finally {
      this.setState({ disabled: false });
    }
  };

  public render() {
    const { store, isTL } = this.props;
    const { newName, newAvatarUrl } = this.state;

    return (
      <div style={{ padding: '0px', fontSize: '14px', height: '100%' }}>
        <Head>
          <title>Your profile at Async</title>
          <meta name="description" content="description" />
        </Head>

        <Grid container style={styleGrid}>
          <Grid item sm={2} xs={12} style={styleGridItem}>
            <SettingList store={store} isTL={isTL} />
          </Grid>
          <Grid item sm={10} xs={12} style={{ padding: '0px 20px' }}>
            <h3>Your profile</h3>
            <p />
            <form onSubmit={this.onSubmit}>
              <h4>Your name</h4>
              <TextField
                value={newName}
                helperText="Your name as seen by your team members"
                onChange={event => {
                  this.setState({ newName: event.target.value });
                }}
              />
              <br />
              <br />
              <Button
                variant="outlined"
                color="primary"
                type="submit"
                disabled={this.state.disabled}
              >
                Update name
              </Button>
            </form>

            <br />
            <h4>Your photo</h4>
            <Avatar
              src={newAvatarUrl}
              style={{
                display: 'inline-flex',
                verticalAlign: 'middle',
                marginRight: 20,
                width: 60,
                height: 60,
              }}
            />
            <label htmlFor="upload-file">
              <Button
                variant="outlined"
                color="primary"
                component="span"
                disabled={this.state.disabled}
              >
                Update photo
              </Button>
            </label>
            <input
              accept="image/*"
              name="upload-file"
              id="upload-file"
              type="file"
              style={{ display: 'none' }}
              onChange={this.uploadFile}
            />
            <br />
            <br />
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default withAuth(withLayout(YourProfile, { teamRequired: false }));
