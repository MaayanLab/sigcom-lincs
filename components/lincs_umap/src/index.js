import Box from '@material-ui/core/Box'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography'
import Carousel from 'react-material-ui-carousel'
const images = [
  {
    src: "./static/img/ldp3-umap-CD-all-zoomed.png",
    alt: "ldp3-umap-CD-all-zoomed.png",
    description: "All normalized landmark Characteristic Direction signatures visualized with UMAP, truncated to focus on the main body, more than 95% of signatures hown, colored by assay type."
  },
  {
    src: image2,
    alt: "./static/img/ldp3-umap-CD-chem-cell-zoomed.png",
    description: "All normalized landmark Characteristic Direction signatures visualized with UMAP, truncated to focus on main body, more than 95% of signatures shown, colored by top 50 most represented cell types."
  },
  {
    src: './static/img/ldp3-umap-CD-chem-moa-zoomed.png',
    alt: "ldp3-umap-CD-chem-moa-zoomed.png",
    description: "All normalized landmark Characteristic Direction signatures visualized with UMAP, truncated to focus on main body, more than 95% of signatures shown, colored by top 50 most represented mechanism of drug mechanisms of action."
  },
  {
    src: "./static/img/ldp3-umap-CD-CRISPR-cell.png",
    alt: "ldp3-umap-CD-CRISPR-cell.png",
    description: "Normalized landmark CRISPR Perturbation signatures visualized with UMAP, colored by cell type."
  }
]

const CarouselItem = ({description, src, ...imgProps}) => (
  <Grid container>
    <Grid item xs={12}>
      <Typography variant="subtitle2">{description}</Typography>
    </Grid>
    <Grid item xs={12}>
      <img {...imgProps} src={new URL(src, import.meta.url)} style={{width: 1000, height: "100%"}}/>
    </Grid>
  </Grid>      
)

export default function LINCSUMAP() {
  return (
    <Grid container  align="center">
      <Grid item xs={12}>
        <Typography variant="h5">
          Global view of L1000 signatures via UMAP
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Carousel interval={5000}>
          {images.map(props=><CarouselItem {...props} key={props.alt}/>)}
        </Carousel>
      </Grid>
    </Grid>
  )
}
