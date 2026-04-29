export async function fetchWithRefresh(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const getToken = () =>
    document.cookie.replace(
      /(?:(?:^|.*;\s*)access_token\s*=\s*([^;]*).*$)|^.*$/,
      '$1'
    )

  let token = getToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 401 && token) {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (refreshRes.ok) {
      const data = await refreshRes.json()
      if (data.accessToken) {
        document.cookie = `access_token=${data.accessToken}; path=/; max-age=${15 * 60}; samesite=strict`
        headers.set('Authorization', `Bearer ${data.accessToken}`)
        res = await fetch(url, { ...options, headers })
      } else {
        window.location.href = '/login'
      }
    } else {
      window.location.href = '/login'
    }
  }

  return res
}
