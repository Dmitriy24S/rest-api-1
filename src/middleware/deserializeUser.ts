import config from 'config'
import { NextFunction, Request, Response } from 'express'
import { get } from 'lodash'
import { reIssueAccessToken } from '../service/session.service'
import { verifyJwt } from '../utils/jwt.utils'

const deserializeUser = async (req: Request, res: Response, next: NextFunction) => {
  // need to get access token from request headers
  // loadash get utility - safer way to access properity that we are unknown if it exists
  // (Gets the property value at path of object. If the resolved value is undefined the defaultValue is used in its place.)

  const accessToken =
    get(req, 'cookies.accessToken') ||
    get(req, 'headers.authorization', '').replace(/^Bearer\s/, '') // get otherwise '', remove word bearer at start of authorization token
  console.log('deserializeUser - accessToken:', accessToken)

  const refreshToken =
    get(req, 'cookies.refreshToken') || (get(req, 'headers.x-refresh') as string) // ! const refreshToken: string
  console.log('deserializeUser - refreshToken:', refreshToken)

  if (!accessToken) {
    return next()
  }

  // verify accessToken
  const { decoded, expired } = verifyJwt(accessToken)
  console.log('deserializeUser - decoded:', decoded)

  // have decoded if valid jwt
  if (decoded) {
    res.locals.user = decoded // attach user to res.locals.user
    return next()
  }

  // If token expired & have refresh token - give user new refreshed token = new access token
  if (expired && refreshToken) {
    // const newAccesssToken = await reIssueAccessToken(refreshToken)
    const newAccessToken = await reIssueAccessToken({ refreshToken }) // check that refresh token is valid & issue new access token // ! Argument of type 'string | false' is not assignable to parameter of type 'string'.

    if (newAccessToken) {
      res.setHeader('x-access-token', newAccessToken)

      // !
      res.cookie('accessToken', newAccessToken, {
        maxAge: 900000, // 15 mins
        httpOnly: true,
        // domain: 'localhost',
        domain: config.get('domain'),
        path: '/',
        sameSite: 'strict',
        secure: false, // ! production https vs http
      })
    }

    // const result = verifyJwt(newAccesssToken) // decode access token // ! Argument of type 'string | false' is not assignable to parameter of type 'string'.
    const result = verifyJwt(newAccessToken as string) // decode access token // ! const newAccesssToken: string | fals

    res.locals.user = result.decoded // attach user to res.locals.user
    return next()
  }

  return next()
}

export default deserializeUser
