import React from 'react'
import clsx from 'clsx'
import { LoadMoreProps } from './PropsType'
import { createNamespace } from '../utils'
import useLockFn from '../hooks/use-lock-fn'
import { getScrollParent } from '../hooks/use-scroll-parent'
import Loading from '../loading'
import ConfigProviderContext from '../config-provider/ConfigProviderContext'

const [bem] = createNamespace('badge')

function isWindow(element: any | Window): element is Window {
  return element === window
}

const LoadMore: React.FC<LoadMoreProps> = props => {
  const { locale } = React.useContext(ConfigProviderContext)
  const [failed, setFailed] = React.useState(false)
  const doLoadMore = useLockFn(async (isRetry: boolean) => {
    try {
      await props.onLoad(isRetry)
    } catch (e) {
      setFailed(true)
      throw e
    }
  })

  const elementRef = React.useRef<HTMLDivElement>(null)

  // Prevent duplicated trigger of `check` function
  const [flag, setFlag] = React.useState({})
  const nextFlagRef = React.useRef(flag)

  const [scrollParent, setScrollParent] = React.useState<
    Window | Element | null | undefined
  >()

  const check = async () => {
    if (nextFlagRef.current !== flag) return
    if (!props.onLoad) return
    const element = elementRef.current
    if (!element) return
    if (!element.offsetParent) return
    const parent = getScrollParent(element)
    setScrollParent(parent)
    if (!parent) return
    const rect = element.getBoundingClientRect()
    const elementTop = rect.top
    const current = isWindow(parent)
      ? window.innerHeight
      : parent.getBoundingClientRect().bottom
    if (current >= elementTop - props.threshold) {
      const nextFlag = {}
      nextFlagRef.current = nextFlag
      await doLoadMore(false)
      setFlag(nextFlag)
    }
  }

  // Make sure to trigger `loadMore` when content changes
  React.useEffect(() => {
    check()
  })

  React.useEffect(() => {
    const element = elementRef.current
    if (!element) return
    if (!scrollParent) return
    function onScroll() {
      check()
    }
    scrollParent.addEventListener('scroll', onScroll)
    return () => {
      scrollParent.removeEventListener('scroll', onScroll)
    }
  }, [scrollParent])

  async function retry() {
    setFailed(false)
    await doLoadMore(true)
    setFlag(nextFlagRef.current)
  }

  const renderDone = () => {
    if (props.doneText) return props.doneText
    return null
  }
  const renderFailed = () => {
    if (props.failedRender) return props.failedRender(retry)

    return (
      <div className={clsx(bem('failed'))}>
        加载失败
        <a onClick={() => retry()}>重新加载</a>
      </div>
    )
  }
  const renderLoading = () => {
    if (props.loadingText) return props.loadingText
    return (
      <Loading className={clsx(bem('loading'))} size={16}>
        {props.loadingText || locale.loading}
      </Loading>
    )
  }
  return (
    <div className={clsx(bem())} ref={elementRef}>
      {typeof props.children === 'function'
        ? props.children(props.done, failed, retry)
        : props.children}
    </div>
  )
}

export default LoadMore