import React, { useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ReactPlayer from 'react-player'
import { Button, ButtonGroup, Grid, Paper, Typography } from '@mui/material'
import { AuthService, VideoService } from '../services'
import { getServedBy, getUrl, getPublicWatchUrl, copyToClipboard } from '../common/utils'
import Navbar from '../components/nav/Navbar'
import { Box } from '@mui/system'

import { Helmet } from 'react-helmet'
import NotFound from './NotFound'
import CopyToClipboard from 'react-copy-to-clipboard'
import LinkIcon from '@mui/icons-material/Link'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SnackbarAlert from '../components/alert/SnackbarAlert'

const URL = getUrl()
const PURL = getPublicWatchUrl()
const SERVED_BY = getServedBy()

function useQuery() {
  const { search } = useLocation()

  return React.useMemo(() => new URLSearchParams(search), [search])
}

const Watch = () => {
  const { id } = useParams()
  const query = useQuery()
  const time = query.get('t')
  const [details, setDetails] = React.useState(null)
  const [loggedIn, setLoggedIn] = React.useState(false)
  const [notFound, setNotFound] = React.useState(false)
  const navigate = useNavigate()
  const videoPlayerRef = useRef(null)
  const [alert, setAlert] = React.useState({ open: false })

  React.useEffect(() => {
    async function fetch() {
      try {
        const resp = (await VideoService.getDetails(id)).data
        setDetails(resp)
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setNotFound({
            title: "We're Sorry...",
            body: "But the video you're looking for was not found.",
          })
        } else {
          setNotFound({
            title: 'Oops!',
            body: 'Something somewhere went wrong.',
          })
        }
      }
    }
    if (details == null) fetch()
  }, [details, id])

  React.useEffect(() => {
    try {
      async function isLoggedIn() {
        setLoggedIn((await AuthService.isLoggedIn()).data)
      }
      isLoggedIn()
    } catch (err) {
      console.error(err)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      navigate('/login')
    } catch (err) {
      console.error(err)
    }
  }
  const handleLogin = async () => {
    try {
      navigate('/login')
    } catch (err) {
      console.error(err)
    }
  }

  const copyTimestamp = () => {
    copyToClipboard(`${PURL}${details?.video_id}?t=${videoPlayerRef.current?.getCurrentTime()}`)
    setAlert({
      type: 'info',
      message: 'Time stamped link copied to clipboard',
      open: true,
    })
  }

  if (notFound) return <NotFound title={notFound.title} body={notFound.body} />

  const options = [{ name: loggedIn ? 'Logout' : 'Login', handler: loggedIn ? handleLogout : handleLogin }]

  const controls = () => (
    <ButtonGroup variant="contained" sx={{ maxWidth: '100%' }}>
      <CopyToClipboard text={`${PURL}${details?.video_id}`}>
        <Button
          onClick={() =>
            setAlert({
              type: 'info',
              message: 'Link copied to clipboard',
              open: true,
            })
          }
        >
          <LinkIcon />
        </Button>
      </CopyToClipboard>
      <Button onClick={copyTimestamp}>
        <AccessTimeIcon />
      </Button>
      <Button
        disabled
        sx={{
          '&.Mui-disabled': {
            borderRight: 'none',
            borderTop: 'none',
          },
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            color: 'white',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {details?.info?.title}
        </div>
      </Button>
    </ButtonGroup>
  )

  return (
    <Navbar options={options} pages={[{ name: 'View All Videos', href: '/feed' }]}>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      <Helmet>
        <title>{details?.info?.title}</title>
        <meta name="description" value={details?.info?.description}></meta>
        <meta property="og:type" value="video" />
        <meta property="og:url" value={window.location.href} />
        <meta property="og:title" value={details?.info?.title} />
        <meta
          property="og:image"
          value={
            SERVED_BY === 'nginx' ? `${URL}/_content/derived/${id}/poster.jpg` : `${URL}/api/video/poster?id=${id}`
          }
        />
        <meta
          property="og:video"
          value={
            SERVED_BY === 'nginx'
              ? `${URL}/_content/video/${id}${details?.extension || '.mp4'}`
              : `${URL}/api/video?id=${id}`
          }
        />
        <meta property="og:video:width" value={details?.info?.width} />
        <meta property="og:video:height" value={details?.info?.height} />
        <meta property="og:site_name" value="Fireshare" />
      </Helmet>
      <Grid container>
        <Grid item xs={12}>
          <ReactPlayer
            ref={videoPlayerRef}
            url={`${
              SERVED_BY === 'nginx'
                ? `${URL}/_content/video/${id}${details?.extension || '.mp4'}`
                : `${URL}/api/video?id=${id}`
            }`}
            width="100%"
            height="auto"
            playing
            config={{
              file: {
                forcedAudio: true,
                attributes: { onLoadedMetadata: () => videoPlayerRef.current.seekTo(time) },
              },
            }}
            controls
            volume={0.5}
          />
        </Grid>
        <Grid item xs={12}>
          <Paper width="100%" square sx={{ p: 1, mt: '-6px', background: 'rgba(0, 0, 0, 0.1)' }}>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, mr: 1 }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  {controls()}
                </Grid>
                {details?.info?.description && (
                  <Grid item xs={12}>
                    <Paper sx={{ width: '100%', p: 2, background: 'rgba(255, 255, 255, 0.12)' }}>
                      <Typography variant="subtitle2">{details?.info?.description}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
            <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  {controls()}
                </Grid>
                {details?.info?.description && (
                  <Grid item xs={12}>
                    <Paper sx={{ width: '100%', p: 2, background: 'rgba(255, 255, 255, 0.12)' }}>
                      <Typography variant="subtitle2">{details?.info?.description}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Navbar>
  )
}

export default Watch
