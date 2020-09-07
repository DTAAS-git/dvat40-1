const DRAWER_TEMPLATE = `
<q-drawer
  v-model="drawer"
  :width="300"
  :breakpoint="500"
  bordered
  content-class="bg-grey-3"
>
  <q-scroll-area class="fit">
    <q-list class="full-height">
      <q-item dense class="q-mt-md text-h6">Video</q-item>
      <q-item dense v-if="video.src">
        <q-item-section>Duration</q-item-section>
        <q-item-section>{{ video.duration }}s @ {{ video.fps }}fps</q-item-section>
      </q-item>
      <q-item dense v-if="video.src">
        <q-item-section>Size</q-item-section>
        <q-item-section>{{ video.width }} &times; {{ video.height }}px &times; {{ video.frames }}</q-item-section>
      </q-item>
      <q-item dense>
        <q-item-section>
          <q-btn-group spread dense flat style="height: 36px">
            <q-btn
              icon="movie"
              @click="handleOpen"
              :label="video.src ? 'reopen' : 'open'"
            ></q-btn>
            <q-btn
              icon="close"
              @click="handleClose"
              v-if="video.src"
              label="close"
            ></q-btn>
          </q-btn-group>
        </q-item-section>
      </q-item>
      <q-item dense class="text-h6" v-if="video.src">Annotations</q-item>
      <q-item dense v-if="video.src">
        <q-item-section>
          <q-btn-group spread dense flat style="height: 36px">
            <q-btn
              icon="cloud_upload"
              @click="handleLoad"
              label="load"
            ></q-btn>
            <q-btn
              icon="cloud_download"
              @click="handleSave"
              label="save"
            ></q-btn>
          </q-btn-group>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-ripple
        v-for="(item, index) in menuList"
        :key="index"
        :to="item.path"
        :active="item.label.toLowerCase() === $route.name.toLowerCase()"
        @click="drawer = false"
      >
        <q-item-section avatar>
          <q-icon :name="item.icon"></q-icon>
        </q-item-section>
        <q-item-section>{{ item.label }}</q-item-section>
      </q-item>
      <q-item class="fixed-bottom">
        <q-item-section class="text-center">
          <a href='https://github.com/anucvml/vidat/releases' target="_blank">{{ version }}</a>
        </q-item-section>
      </q-item>
    </q-list>
  </q-scroll-area>
</q-drawer>
`

import utils from '../libs/utils.js'
import { ActionAnnotation, ObjectAnnotation, RegionAnnotation, SkeletonAnnotation } from '../libs/annotationlib.js'

export default {
  data: () => {
    return {
      version: VERSION,
      menuList: [
        {
          icon: 'video_label',
          label: 'Annotation',
          path: '/annotation',
        },
        {
          icon: 'settings',
          label: 'Configuration',
          path: '/configuration',
        },
        {
          icon: 'dashboard',
          label: 'Preference',
          path: '/preference',
        },
        {
          icon: 'help',
          label: 'Help',
          path: '/help',
        },
        {
          icon: 'book',
          label: 'About',
          path: '/about',
        },
      ],
    }
  },
  methods: {
    ...Vuex.mapMutations([
      'setVideoSrc',
      'setKeyframeList',
      'setLeftCurrentFrame',
      'setRightCurrentFrame',
      'setVideoFPS',
      'closeVideo',
      'setCacheFrameList',
      'setObjectAnnotationListMap',
      'setRegionAnnotationListMap',
      'setSkeletonAnnotationListMap',
      'setActionAnnotationList',
      'importObjectLabelData',
      'importActionLabelData',
      'importSkeletonTypeData',
      'setIsSaved',
    ]),
    handleOpenWithFPS () {
      this.setVideoFPS(this.$store.state.settings.preferenceData.defaultFps)
      utils.importVideo().then(videoSrc => {
        this.setVideoSrc(videoSrc)
      })
    },
    handleOpen () {
      if (this.video.src) {
        utils.confirm('Are you sure to open a new video? You will LOSE all data!').onOk(() => {
          this.closeVideo()
          this.handleOpenWithFPS()
        })
      } else {
        this.handleOpenWithFPS()
      }
    },
    handleClose () {
      utils.confirm('Are you sure to close? You will LOSE all data!').onOk(() => {
        this.closeVideo()
      })
    },
    handleLoad () {
      utils.confirm(
        'Are you sure to load? This would override current data!',
      ).onOk(() => {
        utils.importFile().then(file => {
          try {
            const {
              version,
              annotation,
              configuration,
            } = JSON.parse(file)
            // version
            if (version !== VERSION) {
              utils.notify('Version mismatched, weird things are likely to happen! ' + version + '!=' + VERSION)
            }
            // annotation
            const {
              video,
              keyframeList,
              objectAnnotationListMap,
              regionAnnotationListMap,
              skeletonAnnotationListMap,
              actionAnnotationList,
            } = annotation
            /// video
            this.setVideoFPS(video.fps)
            this.setCacheFrameList([])
            /// keyframeList
            this.setKeyframeList(keyframeList)
            this.setLeftCurrentFrame(0)
            this.setRightCurrentFrame(keyframeList.length > 2 ? keyframeList[1] : keyframeList[0])
            /// objectAnnotationListMap
            for (let frame in objectAnnotationListMap) {
              const objectAnnotationList = objectAnnotationListMap[frame]
              for (let i in objectAnnotationList) {
                let objectAnnotation = objectAnnotationList[i]
                objectAnnotationList[i] = new ObjectAnnotation(
                  objectAnnotation.x,
                  objectAnnotation.y,
                  objectAnnotation.width,
                  objectAnnotation.height,
                  objectAnnotation.labelId,
                  objectAnnotation.color,
                  objectAnnotation.instance,
                  objectAnnotation.score,
                )
              }
            }
            this.setObjectAnnotationListMap(objectAnnotationListMap)
            /// regionAnnotationListMap
            for (let frame in regionAnnotationListMap) {
              const regionAnnotationList = regionAnnotationListMap[frame]
              for (let i in regionAnnotationList) {
                let regionAnnotation = regionAnnotationList[i]
                regionAnnotationList[i] = new RegionAnnotation(
                  regionAnnotation.pointList,
                  regionAnnotation.labelId,
                  regionAnnotation.color,
                  regionAnnotation.instance,
                  regionAnnotation.score,
                )
              }
            }
            this.setRegionAnnotationListMap(regionAnnotationListMap)
            /// skeletonAnnotationListMap
            for (let frame in skeletonAnnotationListMap) {
              const skeletonAnnotationList = skeletonAnnotationListMap[frame]
              for (let i in skeletonAnnotationList) {
                let skeletonAnnotation = skeletonAnnotationList[i]
                const newSkeletonAnnotation = new SkeletonAnnotation(
                  skeletonAnnotation.centerX,
                  skeletonAnnotation.centerY,
                  skeletonAnnotation.typeId,
                  skeletonAnnotation.color,
                  skeletonAnnotation.instance,
                  skeletonAnnotation.score,
                )
                newSkeletonAnnotation._ratio = skeletonAnnotation._ratio
                newSkeletonAnnotation.pointList = skeletonAnnotation.pointList
                skeletonAnnotationList[i] = newSkeletonAnnotation
              }
            }
            this.setSkeletonAnnotationListMap(skeletonAnnotationListMap)
            /// actionAnnotationList
            for (let i in actionAnnotationList) {
              const actionAnnotation = actionAnnotationList[i]
              actionAnnotationList[i] = new ActionAnnotation(
                actionAnnotation.start,
                actionAnnotation.end,
                actionAnnotation.action,
                actionAnnotation.object,
                actionAnnotation.color,
                actionAnnotation.description,
              )
            }
            this.setActionAnnotationList(actionAnnotationList)
            // configuration
            const {
              objectLabelData,
              actionLabelData,
              skeletonTypeData,
            } = configuration
            this.importObjectLabelData(objectLabelData)
            this.importActionLabelData(actionLabelData)
            this.importSkeletonTypeData(skeletonTypeData)
          } catch (e) {
            utils.notify(e.toString())
          }
          utils.notify('Load successfully!')
        })
      })
    },
    handleSave () {
      utils.prompt(
        'Save',
        'Enter annotation filename for saving',
        'annotations').onOk(filename => {
        // remove type in each skeletonAnnotation
        const skeletonAnnotationListMap = {}
        for (const frame in this.skeletonAnnotationListMap) {
          skeletonAnnotationListMap[frame] = this.skeletonAnnotationListMap[frame].map(skeletonAnnotation => {
            return {
              instance: skeletonAnnotation.instance,
              score: skeletonAnnotation.score,
              centerX: skeletonAnnotation.centerX,
              centerY: skeletonAnnotation.centerY,
              typeId: skeletonAnnotation.typeId,
              color: skeletonAnnotation.color,
              _ratio: skeletonAnnotation._ratio,
              pointList: skeletonAnnotation.pointList,
            }
          })
        }
        const data = {
          version: VERSION,
          annotation: {
            video: this.video,
            keyframeList: this.keyframeList,
            objectAnnotationListMap: this.objectAnnotationListMap,
            regionAnnotationListMap: this.regionAnnotationListMap,
            skeletonAnnotationListMap,
            actionAnnotationList: this.actionAnnotationList,
          },
          configuration: {
            objectLabelData: this.objectLabelData,
            actionLabelData: this.actionLabelData,
            skeletonTypeData: this.skeletonTypeData,
          },
        }
        Quasar.utils.exportFile(
          filename + '.json',
          new Blob([JSON.stringify(data)]),
          { type: 'text/plain' },
        )
        this.setIsSaved(true)
      })
    },
  },
  computed: {
    drawer: {
      get () {
        return this.$store.state.drawer
      },
      set (value) {
        this.$store.commit('setDrawer', value)
      },
    },
    video () {
      return this.$store.state.annotation.video
    },
    keyframeList () {
      return this.$store.state.annotation.keyframeList
    },
    objectLabelData () {
      return this.$store.state.settings.objectLabelData
    },
    actionLabelData () {
      return this.$store.state.settings.actionLabelData
    },
    skeletonTypeData () {
      return this.$store.state.settings.skeletonTypeData
    },
    preferenceData () {
      return this.$store.state.settings.preferenceData
    },
    objectAnnotationListMap () {
      return this.$store.state.annotation.objectAnnotationListMap
    },
    regionAnnotationListMap () {
      return this.$store.state.annotation.regionAnnotationListMap
    },
    skeletonAnnotationListMap () {
      return this.$store.state.annotation.skeletonAnnotationListMap
    },
    actionAnnotationList () {
      return this.$store.state.annotation.actionAnnotationList
    },
  },
  template: DRAWER_TEMPLATE,
}
