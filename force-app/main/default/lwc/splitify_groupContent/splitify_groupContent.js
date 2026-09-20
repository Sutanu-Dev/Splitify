import { LightningElement, track, wire } from 'lwc';
import getAlbumPhotos from '@salesforce/apex/splitify_service.getAlbumPhotos';
import { CurrentPageReference } from 'lightning/navigation';
import getPlaylistVideos from '@salesforce/apex/YTPlaylist.getPlaylistVideos';

export default class Splitify_groupContent extends LightningElement {

    @track photos = [];
    photosAvailable = false;
    currentImage = '';
    showPhotoViewer = false;
    albumId = '' ;
    YTid = '';
    showNoPhotosMessage = false;
    showNoVideoMessage = false;
    isLoading = true;
    gridView = true;
    photoTab = true;
    videoTab = false;
    videos = [];


    @wire(CurrentPageReference)
        getStateParameters(currPage) {
            if (currPage?.state?.albumId) {
                this.albumId = currPage.state.albumId;
            }
            if (currPage?.state?.YTalbumId) {
                this.YTid = currPage.state.YTalbumId;
            }
        }

    @wire(getAlbumPhotos, {AlbumId : '$albumId'})
    wiredPhotos({ data, error }) {
        if (data == null || data == undefined){
            return;
        } 
        if (data[0] === 'no album id' || data.length === 0){
            this.showNoPhotosMessage = true;
            this.isLoading = false;
            return;
        }

        this.photos = data;
        this.isLoading = false;
        this.photosAvailable = true;

        if (error) {
            this.isLoading = false;
            console.error('Error fetching album photos', error);
        }
    }
    

    showImage(event){
        this.showPhotoViewer = true;
        this.currentImage = event.target.src;

        setTimeout(() => {
            const photoViewer = this.template.querySelector('.photo-viewer');
            if (photoViewer) photoViewer.showModal();
        }, 0);
    }

    closePhotoViewer(){
        const photoViewer = this.template.querySelector('.photo-viewer');
        photoViewer.close();
        this.showPhotoViewer = false;
    }

    changeGalleryView(){
        const gallery = this.template.querySelector('.gallery');
        
        if(this.gridView === true){
            gallery.style.setProperty('grid-template-columns', 'repeat(1, 1fr)');
            
        } else {
            gallery.style.setProperty('grid-template-columns', 'repeat(3, 1fr)');
        }
        this.gridView = !this.gridView;
    }


  @wire(getPlaylistVideos, { YTPlaylistId: '$YTid'})
  wiredVideos({ data, error }) {

    if (data) {
      this.videos = data.map(video => ({
        ...video,
        embedUrl: `https://www.youtube.com/embed/${video.videoId}`
      }));
    } else if (error) {
      console.error('YouTube error:', error);
    }
  }

  showVideoTab(){
    let videoTab = this.template.querySelector('.video-tab');
    let photoTab = this.template.querySelector('.photo-tab');
    this.videoTab = true;
    this.photoTab = false;
    if(photoTab){
        photoTab.style.borderBottom = 'none';
    }
    if(videoTab){
        videoTab.style.borderBottom = '4px solid #008dff';
    }

    if(this.YTid === '' || this.YTid == null || this.videos.length === 0){
        this.showNoVideoMessage = true;
    }
  }

  showPhotoTab(){
    let videoTab = this.template.querySelector('.video-tab');
    let photoTab = this.template.querySelector('.photo-tab');
    this.videoTab = false;
    this.photoTab = true;
    if(photoTab){
        photoTab.style.borderBottom = '4px solid #008dff';
    }
    if(videoTab){
        videoTab.style.borderBottom = 'none';
    }
  }

}