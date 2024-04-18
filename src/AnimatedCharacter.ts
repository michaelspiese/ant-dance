import * as THREE from 'three'
import { Skeleton } from './Skeleton'
import { MotionClip } from './MotionClip'
import { Pose } from './Pose';
import { Bone } from './Bone';

export class AnimatedCharacter extends THREE.Object3D
{
    public skeleton: Skeleton;
    public fps: number;
    public useAbsolutePosition: boolean;
    
    private clip: MotionClip | null;
    
    private currentTime: number;
    private currentPose: Pose;
    
    private overlayQueue: MotionClip[];
    private overlayTransitionFrames: number[];
    private overlayTime: number;
    private overlayPose: Pose;

    constructor(fps = 60, useAbsolutePosition = true)
    {
        super();
        
        this.skeleton = new Skeleton(this);
        this.fps = fps;
        this.useAbsolutePosition = useAbsolutePosition;

        this.clip = null;

        this.currentTime = 0;
        this.currentPose = new Pose();
        
        this.overlayQueue = [];
        this.overlayTransitionFrames = [];
        this.overlayTime = 0;  
        this.overlayPose = new Pose();
    }

    createMeshes(showAxes: boolean): void
    {
        if(showAxes)
        {
            this.skeleton.rootTransform.add(new THREE.AxesHelper(0.15));
        }

        this.skeleton.rootBones.forEach((rootBone: Bone) => {
            this.createMeshesRecursive(rootBone, showAxes)
        });
    }

    private createMeshesRecursive(bone: Bone, showAxes: boolean): void
    {
        // Draw the axis helpers if specified
        if(showAxes)
            bone.transform.add(new THREE.AxesHelper(0.15));

        // Draw the bone so that the character will be diplayed as a stick figure
        let skeletonMesh = this.drawSkeleton(bone)
        bone.transform.add(skeletonMesh);

        // Defining a material for the ant's body
        var antMaterial = new THREE.MeshLambertMaterial({color: 'maroon'})

        // Defining a more interesting model for the ant
        // I chose to base my model around the instructor's model
        if (bone.name == 'head') 
        {
            // Defineing geometries corresponding to each part of the head (head, antennas, mouth, and eyes)
            let headGroup = new THREE.Group();
            let antennaGroup = new THREE.Group();
            let antennaMaterial = new THREE.MeshLambertMaterial({color: 'black'});
            let headGeometry = new THREE.SphereGeometry(0.1).scale(1, 2, 1)
            let antennaGeometry = new THREE.CylinderGeometry(0, 0.015, 0.2)
            let mouthGeometry = new THREE.SphereGeometry(0.02).scale(2, 1, 1)
            let eyeGeometry = new THREE.SphereGeometry(0.02)

            // Draw the head and add it to the group
            let head = new THREE.Mesh(headGeometry, antMaterial)
            headGroup.add(head)

            // Draw the ant's individual antenna segments
            let rightAntenna = new THREE.Group()
            let antennaBottom = new THREE.Mesh(antennaGeometry, antennaMaterial).translateY(0.1)
            let antennaTop = new THREE.Mesh().copy(antennaBottom)

            // Create the antenna group from the individual segments
            antennaTop.rotateX(Math.PI / 3)
            antennaTop.position.set(0, 0.2, 0.07)
            rightAntenna.add(antennaTop, antennaBottom)
            let leftAntenna = new THREE.Group().copy(rightAntenna)

            // Rotate and translate each antenna group into their correct place relative to each other
            rightAntenna.rotateZ(Math.PI / 6).translateY(0.07)
            leftAntenna.rotateZ(-Math.PI / 6).translateY(0.07)
            antennaGroup.add(leftAntenna, rightAntenna)

            // Rotate and translate the antenna group into its correct place relative to the head
            antennaGroup.rotateX(Math.PI / 4)
            antennaGroup.position.set(0, 0.12, 0)
            headGroup.add(antennaGroup)

            // Draw the ant's eyes
            let leftEye = new THREE.Mesh(eyeGeometry, antennaMaterial)
            leftEye.position.set(0.04, 0.06, 0.085)
            let rightEye = new THREE.Mesh().copy(leftEye).translateX(-0.08)
            headGroup.add(leftEye, rightEye)

            // Draw the mouth
            let mouth = new THREE.Mesh(mouthGeometry, antennaMaterial)
            mouth.position.set(0, -0.2, 0)
            headGroup.add(mouth)

            // Potition the entire head in the correct place relative to the body
            headGroup.rotateX(-Math.PI / 6)
            headGroup.translateZ(-0.05)
            headGroup.position.set(0, 0.07, 0.05)
            bone.transform.add(headGroup)
        }
        else if (bone.name == 'lowerneck')
        {
            // Drawing and placing the ant's neck
            let neckGeometry = new THREE.SphereGeometry(0.1)
            let neck = new THREE.Mesh(neckGeometry, antMaterial)
            bone.transform.add(neck)
        }
        else if (bone.name == 'upperback')
        {
            // Drawing and placing the ant's thorax
            let thoraxGeometry = new THREE.SphereGeometry(0.1)
            let thorax = new THREE.Mesh(thoraxGeometry, antMaterial)
            thorax.translateY(0.05)
            bone.transform.add(thorax)
        }
        else if (bone.name == 'lowerback')
        {
            // Drawing and placing the ant's abdomen
            let abdomenGeometry = new THREE.SphereGeometry(0.15)
            let abdomen = new THREE.Mesh(abdomenGeometry, antMaterial)
            abdomen.scale.set(1, 2, 1)
            abdomen.rotateX(Math.PI / 6)
            abdomen.position.set(0, -0.125, -0.1)
            bone.transform.add(abdomen)
        }

        // Recursively this function for each of the bone's children
        bone.children.forEach((boneChild: Bone) => {
            this.createMeshesRecursive(boneChild, showAxes);
        });
    }

    loadSkeleton(filename: string): void
    {
        this.skeleton.loadFromASF(filename);
    }

    loadMotionClip(filename: string): MotionClip
    {
        const clip = new MotionClip();
        clip.loadFromAMC(filename, this.skeleton);
        return clip;
    }

    play(clip: MotionClip): void
    {
        this.stop();
        this.clip = clip;
        this.currentPose = this.clip.frames[0];
    }

    stop(): void
    {
        this.clip = null;
        this.currentTime = 0;

        this.overlayQueue = [];
        this.overlayTransitionFrames = [];
        this.overlayTime = 0;
    }

    overlay(clip: MotionClip, transitionFrames: number): void
    {
        this.overlayQueue.push(clip);
        this.overlayTransitionFrames.push(transitionFrames);
    }

    update(deltaTime: number): void
    {
        // If the motion queue is empty, then do nothing
        if(!this.clip)
            return;

        // Advance the time
        this.currentTime += deltaTime;

        // Set the next frame number
        let currentFrame = Math.floor(this.currentTime * this.fps);

        if(currentFrame >= this.clip.frames.length)
        {
            currentFrame = 0;
            this.currentTime = 0;   
            this.currentPose = this.clip.frames[0];
        }

        let overlayFrame = 0;

        // Advance the overlay clip if there is one
        if(this.overlayQueue.length > 0)
        {
            this.overlayTime += deltaTime;

            overlayFrame = Math.floor(this.overlayTime * this.fps);

            if(overlayFrame >= this.overlayQueue[0].frames.length)
            {
                this.overlayQueue.shift();
                this.overlayTransitionFrames.shift();
                this.overlayTime = 0;
                overlayFrame = 0;
            }
        }

        const pose = this.computePose(currentFrame, overlayFrame);
        this.skeleton.update(pose, this.useAbsolutePosition);
    }

    public getQueueCount(): number
    {
        return this.overlayQueue.length;
    }

    private computePose(currentFrame: number, overlayFrame: number): Pose
    {
        // If there is an active overlay track
        if(this.overlayQueue.length > 0)
        {
            // Start out with the unmodified overlay pose
            const overlayPose = this.overlayQueue[0].frames[overlayFrame].clone();

            let alpha = 0;

            // Fade in the overlay
            if(overlayFrame < this.overlayTransitionFrames[0])
            {
                alpha = 1 - overlayFrame / this.overlayTransitionFrames[0];
                overlayPose.lerp(this.clip!.frames[currentFrame], alpha);
            }
            // Fade out the overlay
            else if (overlayFrame > this.overlayQueue[0].frames.length - this.overlayTransitionFrames[0])
            {
                alpha = 1 - (this.overlayQueue[0].frames.length - overlayFrame) / this.overlayTransitionFrames[0];
                overlayPose.lerp(this.clip!.frames[currentFrame], alpha);
            }

            if(!this.useAbsolutePosition)
            {
                const relativeOverlayPosition = this.overlayQueue[0].frames[overlayFrame].getRootPosition();
                relativeOverlayPosition.sub(this.overlayPose.getRootPosition());

                const relativePosition = this.clip!.frames[currentFrame].getRootPosition();
                relativePosition.sub(this.currentPose.getRootPosition());

                relativeOverlayPosition.lerpVectors(relativeOverlayPosition, relativePosition, alpha);
                this.position.add(relativeOverlayPosition);

                this.overlayPose = this.overlayQueue[0].frames[overlayFrame];
                this.currentPose = this.clip!.frames[currentFrame];
            }
            
            return overlayPose;
        }
        // Motion is entirely from the base track
        else
        {
            if(!this.useAbsolutePosition)
            {
                const relativePosition = this.clip!.frames[currentFrame].getRootPosition();
                relativePosition.sub(this.currentPose.getRootPosition());
                this.position.add(relativePosition);
                this.currentPose = this.clip!.frames[currentFrame];
            }

            return this.clip!.frames[currentFrame];
        }
    }

    private drawSkeleton (bone: Bone)
    {
        // Defining the material and geometry of each bone
        let material = new THREE.MeshLambertMaterial({color: 'black'});
        let find = new THREE.MeshLambertMaterial({color: 'white'});
        let boneGeometry = new THREE.BoxGeometry(0.02, 0.02, bone.length);

        // Creating the bone's mesh
        if (bone.name == 'lowerback') {
            var boneMesh = new THREE.Mesh(boneGeometry, find);
        } else {
            var boneMesh = new THREE.Mesh(boneGeometry, material);
        }

        // Rotating the bone to look in the correct direction
        boneMesh.lookAt(bone.direction)
        
        // Shifting each bone so that they all match up
        boneMesh.translateZ(-bone.length / 2)

        // Return the new bone mesh with correct orientation
        return boneMesh;
    }
}